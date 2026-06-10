"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Box,
  Card,
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Avatar,
  Stack,
  Paper,
  Alert,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import Navigation from "@/components/navigation";
import {
  interviewService,
  type InterviewHistory,
  type Question,
} from "@/services/interviewService";
import { io as SocketClient, Socket } from "socket.io-client";

type ChatHistory = {
  id: string | number;
  role: "AI" | "USER";
  content: string;
  questionId?: number | null;
  answer?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type InterviewViewData = {
  history: InterviewHistory;
  currentQ: Question | null;
};

type AnswerSavedPayload = {
  questionId: number;
  answer: any;
};

type AnswerScoredPayload = {
  answerId: number;
  questionId: number;
  score: {
    finalScore: number;
    feedback?: string;
    reason?: string;
    type?: string;
  };
};

const normalizeChatHistories = (chatHistories: ChatHistory[] = []) => {
  const uniqueChatHistories: ChatHistory[] = [];
  const seenAiQuestionIds = new Set<number>();
  const seenAiContents = new Set<string>();

  chatHistories.forEach((ch) => {
    if (ch.role === "AI") {
      if (ch.questionId) {
        if (!seenAiQuestionIds.has(ch.questionId)) {
          seenAiQuestionIds.add(ch.questionId);
          uniqueChatHistories.push(ch);
        }
      } else if (!seenAiContents.has(ch.content)) {
        seenAiContents.add(ch.content);
        uniqueChatHistories.push(ch);
      }
      return;
    }

    const lastPushed = uniqueChatHistories[uniqueChatHistories.length - 1];
    if (
      lastPushed &&
      lastPushed.role === "USER" &&
      lastPushed.content === ch.content
    ) {
      if (ch.answer && !lastPushed.answer) {
        uniqueChatHistories[uniqueChatHistories.length - 1] = ch;
      }
      return;
    }

    uniqueChatHistories.push(ch);
  });

  return uniqueChatHistories;
};

const upsertChatHistory = (
  chatHistories: ChatHistory[],
  nextChat: ChatHistory,
) => {
  const nextChatHistories = [...chatHistories];
  const matchIndex = nextChatHistories.findIndex((ch) => {
    if (ch.role !== nextChat.role) return false;

    if (nextChat.questionId !== undefined && nextChat.questionId !== null) {
      return ch.questionId === nextChat.questionId;
    }

    return ch.content === nextChat.content;
  });

  if (matchIndex >= 0) {
    nextChatHistories[matchIndex] = {
      ...nextChatHistories[matchIndex],
      ...nextChat,
      answer: nextChat.answer ?? nextChatHistories[matchIndex].answer,
    };
  } else {
    nextChatHistories.push(nextChat);
  }

  return normalizeChatHistories(nextChatHistories);
};

const applyAnswerScore = (
  chatHistories: ChatHistory[],
  payload: AnswerScoredPayload,
) =>
  chatHistories.map((ch) => {
    if (ch.role !== "USER" || !ch.answer) {
      return ch;
    }

    if (
      ch.answer.id === payload.answerId ||
      ch.questionId === payload.questionId
    ) {
      return {
        ...ch,
        answer: {
          ...ch.answer,
          score: payload.score,
        },
      };
    }

    return ch;
  });

export default function InterviewChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const interviewId = parseInt(id, 10);
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ANSWER_TIME_LIMIT = 90; // 90 detik = 1.5 menit

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewViewData | null>(
    null,
  );
  const [skippedNotification, setSkippedNotification] = useState(false);
  const [finalResume, setFinalResume] = useState("");
  const [submittedFinalResume, setSubmittedFinalResume] = useState("");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(ANSWER_TIME_LIMIT);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentQuestionIdRef = useRef<number | null>(null);
  const interviewIdRef = useRef<number>(interviewId);

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerActive(false);
  };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(ANSWER_TIME_LIMIT);
    setIsTimerActive(true);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          setIsTimerActive(false);

          // Auto-skip: emit ke socket
          const sock = socketRef.current;
          const qId = currentQuestionIdRef.current;
          const iId = interviewIdRef.current;
          if (sock && sock.connected && qId !== null) {
            sock.emit("skip-question", { interviewId: iId, questionId: qId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetcher = async ([, , token]: [
    string,
    number,
    string,
  ]): Promise<InterviewViewData> => {
    const history = await interviewService.getInterviewHistory(
      interviewId,
      token,
    );
    if (!history) {
      throw new Error("Gagal mengambil riwayat wawancara");
    }
    let currentQ: Question | null = null;
    if (history.status !== "FINISH") {
      const q = await interviewService.getCurrentQuestion(interviewId, token);
      currentQ = q ?? null;
    }
    return { history, currentQ };
  };

  const { data, error, isLoading } = useSWR<InterviewViewData>(
    session?.accessToken
      ? ["interview", interviewId, session.accessToken]
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  );

  useEffect(() => {
    if (data) {
      setInterviewData(data);
    }
  }, [data]);

  // Mulai timer saat data pertama kali dimuat dan ada pertanyaan aktif
  useEffect(() => {
    if (data?.currentQ && data.history.status !== "FINISH") {
      currentQuestionIdRef.current = data.currentQ.id;
      startTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Cleanup timer saat unmount
  useEffect(() => {
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!session?.accessToken) return;

    const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
    const socketInstance = SocketClient(baseURL, {
      auth: {
        token: session.accessToken,
      },
    });

    socketInstance.on("connect", () => {
      setIsSocketConnected(true);
      socketInstance.emit("join-interview", interviewId);
    });

    socketInstance.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socketInstance.on("answer-saved", (payload: AnswerSavedPayload) => {
      setInterviewData((current) => {
        if (!current) return current;

        const chatHistories = (current.history.chatHistories ||
          []) as ChatHistory[];
        const answerContent =
          typeof payload.answer === "string"
            ? payload.answer
            : (payload.answer?.content ?? "");

        if (payload.questionId === -1) {
          return {
            ...current,
            history: {
              ...current.history,
              chatHistories: upsertChatHistory(chatHistories, {
                id: `user-chat-intro-${Date.now()}`,
                role: "USER",
                content: answerContent,
                questionId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
            },
          };
        }

        const savedAnswer =
          typeof payload.answer === "object" && payload.answer
            ? payload.answer
            : null;

        return {
          ...current,
          history: {
            ...current.history,
            chatHistories: upsertChatHistory(chatHistories, {
              id:
                savedAnswer?.id ??
                `user-chat-${payload.questionId}-${Date.now()}`,
              role: "USER",
              content: answerContent,
              questionId: payload.questionId,
              answer: savedAnswer ?? undefined,
              createdAt: savedAnswer?.createdAt ?? new Date().toISOString(),
              updatedAt: savedAnswer?.createdAt ?? new Date().toISOString(),
            }),
          },
        };
      });
    });

    socketInstance.on("new-question", (nextQuestion: Question | null) => {
      setInterviewData((current) => {
        if (!current || !nextQuestion) return current;

        const chatHistories = (current.history.chatHistories ||
          []) as ChatHistory[];

        return {
          ...current,
          currentQ: nextQuestion,
          history: {
            ...current.history,
            chatHistories: upsertChatHistory(chatHistories, {
              id: `ai-chat-${nextQuestion.id}-${Date.now()}`,
              role: "AI",
              content: nextQuestion.content,
              questionId: nextQuestion.id === -1 ? null : nextQuestion.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        };
      });

      // Start/reset timer untuk pertanyaan baru
      currentQuestionIdRef.current = nextQuestion?.id ?? null;
      startTimer();
      setIsSubmittingAnswer(false);
    });

    socketInstance.on("answer-scored", (payload: AnswerScoredPayload) => {
      setInterviewData((current) => {
        if (!current) return current;

        return {
          ...current,
          history: {
            ...current.history,
            chatHistories: applyAnswerScore(
              (current.history.chatHistories || []) as ChatHistory[],
              payload,
            ),
          },
        };
      });
    });

    socketInstance.on("interview-finished", () => {
      setIsSubmittingAnswer(false);
      stopTimer();
      setInterviewData((current) => {
        if (!current) return current;

        return {
          ...current,
          currentQ: null,
          history: {
            ...current.history,
            status: "FINISH",
          },
        };
      });
    });

    socketInstance.on("error", (err: any) => {
      setIsSubmittingAnswer(false);
      console.error(err.message);
    });

    socketInstance.on("question-skipped", () => {
      setSkippedNotification(true);
      setTimeout(() => setSkippedNotification(false), 4000);
    });

    setSocket(socketInstance);
    socketRef.current = socketInstance;

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.accessToken, interviewId]);

  const activeData = interviewData ?? data;
  const persistedFinalResume = activeData?.history?.finalResume ?? "";

  useEffect(() => {
    if (activeData?.history?.finalResume !== undefined) {
      setFinalResume(activeData.history.finalResume ?? "");
    }
  }, [activeData?.history?.finalResume]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeData, isSubmittingAnswer]);

  const formik = useFormik({
    initialValues: { answer: "" },
    validationSchema: Yup.object({
      answer: Yup.string().required("Jawaban tidak boleh kosong"),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!session?.accessToken || !activeData?.currentQ) return;
      try {
        setIsSubmittingAnswer(true);
        stopTimer(); // Stop timer saat user submit
        if (socket && isSocketConnected) {
          socket.emit("submit-answer", {
            interviewId,
            answer: values.answer,
            questionId: activeData.currentQ.id,
          });
          resetForm();
        } else {
          const response = await interviewService.submitAnswer(
            interviewId,
            values.answer,
            activeData.currentQ.id,
            session.accessToken,
          );
          const submission = response.data;
          if (!submission) {
            throw new Error("Gagal menyimpan jawaban");
          }

          setInterviewData((current) => {
            if (!current) return current;

            const chatHistories = (current.history.chatHistories ||
              []) as ChatHistory[];
            const nextChatHistories = upsertChatHistory(chatHistories, {
              id:
                submission.answer?.id ??
                `fallback-user-chat-${interviewId}-${Date.now()}`,
              role: "USER",
              content: submission.answer?.content ?? values.answer,
              questionId: submission.questionId,
              answer: submission.answer,
              createdAt:
                submission.answer?.createdAt ?? new Date().toISOString(),
              updatedAt:
                submission.answer?.createdAt ?? new Date().toISOString(),
            });

            if (submission.nextQuestion) {
              return {
                ...current,
                currentQ: submission.nextQuestion,
                history: {
                  ...current.history,
                  chatHistories: nextChatHistories,
                },
              };
            }

            return {
              ...current,
              currentQ: null,
              history: {
                ...current.history,
                status: "FINISH",
                chatHistories: nextChatHistories,
              },
            };
          });

          resetForm();
          setIsSubmittingAnswer(false);
        }
      } catch (error) {
        setIsSubmittingAnswer(false);
        console.error("Gagal mengirim jawaban", error);
      }
    },
  });

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        const elem = containerRef.current as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        if (activeData?.history?.status === "FINISH") {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        } else {
          setShowExitWarning(true);
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const handleFinalResumeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedFinalResume = finalResume.trim();
    if (!trimmedFinalResume || !session?.accessToken) return;

    try {
      const updatedInterview = await interviewService.updateFinalResume(
        interviewId,
        session.accessToken,
        trimmedFinalResume,
      );

      setSubmittedFinalResume(trimmedFinalResume);
      setInterviewData((current) => {
        if (!current) return current;

        return {
          ...current,
          history: {
            ...current.history,
            finalResume: updatedInterview?.finalResume ?? trimmedFinalResume,
          },
        };
      });
    } catch (error) {
      console.error("Gagal menyimpan final resume", error);
    }
  };

  type MessageType = {
    sender: "AI" | "USER";
    text: string;
    id: string | number;
    scoreObj?: { score: number; reason: string; type: string } | null;
  };
  const messages: MessageType[] = [];

  let safeChatHistories = activeData?.history?.chatHistories || [];
  if (activeData?.history) {
    const uniqueChatHistories: any[] = [];
    const seenAiQuestionIds = new Set();
    const seenAiContents = new Set();

    safeChatHistories.forEach((ch: any) => {
      // Filter: jangan tampilkan pesan USER dengan konten "[SKIPPED]"
      if (ch.role === "USER" && ch.content === "[SKIPPED]") return;

      if (ch.role === "AI") {
        if (ch.questionId) {
          if (!seenAiQuestionIds.has(ch.questionId)) {
            seenAiQuestionIds.add(ch.questionId);
            uniqueChatHistories.push(ch);
          }
        } else {
          if (!seenAiContents.has(ch.content)) {
            seenAiContents.add(ch.content);
            uniqueChatHistories.push(ch);
          }
        }
      } else {
        const lastPushed = uniqueChatHistories[uniqueChatHistories.length - 1];
        if (
          lastPushed &&
          lastPushed.role === "USER" &&
          lastPushed.content === ch.content
        ) {
          // Deduplicate consecutive identical user messages, keep the one with an answer object
          if (ch.answer && !lastPushed.answer) {
            uniqueChatHistories[uniqueChatHistories.length - 1] = ch;
          }
        } else {
          uniqueChatHistories.push(ch);
        }
      }
    });
    safeChatHistories = uniqueChatHistories;
  }

  const isFinished = activeData?.history?.status === "FINISH";
  const aiChatsCount = safeChatHistories.filter(
    (ch: any) => ch.role === "AI",
  ).length;
  const totalQuestions = aiChatsCount;

  let totalScore = 0;
  let scoredAnswersCount = 0;
  const summaryPoints: string[] = [];

  if (activeData?.history) {
    const sortedChats = safeChatHistories;

    sortedChats.forEach((ch: any) => {
      let scoreObj: {
        score: number;
        reason: string;
        type: "technical" | "softskill";
      } | null = null;
      if (ch.role === "USER" && ch.answer) {
        const matchingAns = ch.answer;
        const categoryName = matchingAns.question
          ? (matchingAns.question as any).category?.name ||
            matchingAns.question.type
          : "";

        if (matchingAns.score) {
          const s = matchingAns.score;
          const feedbackText = s.reason || s.feedback || "";
          scoreObj = {
            score: s.finalScore,
            reason: s.reason || s.feedback || "",
            type: s.type === "SOFTSKILL" ? "softskill" : "technical",
          };
          totalScore += s.finalScore;
          scoredAnswersCount++;
          if (feedbackText) {
            summaryPoints.push(`[${categoryName}] ${feedbackText}`);
          }
        }
      }

      messages.push({
        sender: ch.role,
        text: ch.content,
        id: `chat-${ch.id}`,
        scoreObj,
      });
    });

    if (activeData.currentQ) {
      const currentQ = activeData.currentQ;
      const alreadyRendered = safeChatHistories.some(
        (ch: any) =>
          (ch.questionId === currentQ.id && ch.role === "AI") ||
          (currentQ.id === -1 &&
            ch.role === "AI" &&
            ch.content === currentQ.content) ||
          ch.content === currentQ.content,
      );

      if (!alreadyRendered) {
        messages.push({
          sender: "AI",
          text: currentQ.content,
          id: `q-current-${currentQ.id}`,
        });
      }
    }
  }

  const overallScore =
    scoredAnswersCount > 0 ? Math.round(totalScore / scoredAnswersCount) : 0;

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <Navigation />
      <Container
        maxWidth="md"
        sx={{
          flexGrow: 1,
          py: 3,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Card
          elevation={0}
          sx={{
            flexGrow: 1,
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderBottom: "1px solid #e2e8f0",
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
            }}
          >
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "start" }}
              spacing={2}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  🎤 Sesi Wawancara
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Jawab pertanyaan dengan jelas dan profesional.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <IconButton
                  onClick={toggleFullscreen}
                  size="small"
                  title={
                    isFullscreen ? "Keluar Fullscreen" : "Masuk Fullscreen"
                  }
                  sx={{
                    color: "primary.main",
                    "&:hover": {
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                    },
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
                <Chip
                  label={
                    isFinished ? "✓ Selesai" : `Pertanyaan ${totalQuestions}`
                  }
                  color={isFinished ? "success" : "primary"}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Stack>
          </Box>

          {/* Progress Bar */}
          {!isFinished && (
            <Box
              sx={{
                height: 4,
                background: "#e2e8f0",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                  width: `${Math.min((totalQuestions / 10) * 100, 95)}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </Box>
          )}

          {/* Chat Area */}
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              p: { xs: 2, sm: 3.5 },
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              bgcolor: "#fafbfc",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isLoading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                }}
              >
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography color="text.secondary">
                  Memuat data wawancara...
                </Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Gagal memuat data wawancara. Silakan coba lagi.
              </Alert>
            ) : messages.length === 0 && !isFinished ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <Typography color="text.secondary" align="center">
                  Belum ada pertanyaan.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === "USER";
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                        gap: 1.5,
                        animation: "slideIn 0.3s ease",
                        "@keyframes slideIn": {
                          from: {
                            opacity: 0,
                            transform: isUser
                              ? "translateX(20px)"
                              : "translateX(-20px)",
                          },
                          to: {
                            opacity: 1,
                            transform: "translateX(0)",
                          },
                        },
                      }}
                    >
                      {!isUser && (
                        <Avatar
                          sx={{
                            bgcolor:
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            width: 40,
                            height: 40,
                            fontWeight: 700,
                            fontSize: "1rem",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                            flexShrink: 0,
                          }}
                        >
                          🤖
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          px: 3,
                          maxWidth: "85%",
                          borderRadius: 3,
                          borderTopRightRadius: isUser ? 4 : undefined,
                          borderTopLeftRadius: !isUser ? 4 : undefined,
                          bgcolor: isUser ? "#10b981" : "#ffffff",
                          color: isUser ? "white" : "text.primary",
                          boxShadow: isUser
                            ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                            : "0 2px 8px rgba(0, 0, 0, 0.06)",
                          border: isUser ? "none" : "1px solid #e2e8f0",
                          wordWrap: "break-word",
                        }}
                      >
                        <Typography
                          sx={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.6,
                            fontSize: { xs: "0.95rem", sm: "1rem" },
                          }}
                        >
                          {msg.text}
                        </Typography>
                        {isUser && isFinished && msg.scoreObj && (
                          <Box
                            sx={{
                              mt: 1.5,
                              p: 1.5,
                              bgcolor: "rgba(255, 255, 255, 0.15)",
                              borderRadius: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800, mb: 0.5, color: "#fff" }}
                            >
                              Skor Jawaban: {Math.round(msg.scoreObj.score)}/100
                            </Typography>
                            {msg.scoreObj.reason && (
                              <Typography
                                variant="body2"
                                sx={{ opacity: 0.9, color: "#fff" }}
                              >
                                {msg.scoreObj.reason}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                      {isUser && (
                        <Avatar
                          sx={{
                            bgcolor: "#059669",
                            width: 40,
                            height: 40,
                            fontWeight: 700,
                            fontSize: "1rem",
                            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                            flexShrink: 0,
                          }}
                        >
                          👤
                        </Avatar>
                      )}
                    </Box>
                  );
                })}
                {isFinished && (
                  <Box
                    sx={{
                      pt: 3,
                      pb: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        width: "100%",
                        border: "1px solid #e2e8f0",
                        borderRadius: 3,
                        mb: 3,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          p: 2.5,
                          bgcolor: "rgba(16, 185, 129, 0.08)",
                          borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 800, color: "#059669" }}
                        >
                          📊 Hasil Penilaian Wawancara
                        </Typography>
                        <Chip
                          label={`Skor Keseluruhan: ${overallScore}/100`}
                          color="primary"
                          sx={{
                            fontWeight: 800,
                            fontSize: "1.05rem",
                            py: 2.5,
                            px: 1,
                          }}
                        />
                      </Box>
                      <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, mb: 2 }}
                        >
                          📝 Ringkasan Evaluasi
                        </Typography>
                        <Stack spacing={2}>
                          {summaryPoints.length > 0 ? (
                            summaryPoints.map((point, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: "flex",
                                  gap: 1.5,
                                  alignItems: "flex-start",
                                }}
                              >
                                <Typography
                                  color="primary"
                                  sx={{ fontWeight: 800, mt: "-2px" }}
                                >
                                  •
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ lineHeight: 1.6 }}
                                >
                                  {point}
                                </Typography>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Belum ada ringkasan yang tersedia.
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      {activeData?.history?.resume && (
                        <Box
                          sx={{
                            p: { xs: 2.5, sm: 3.5 },
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, mb: 2 }}
                          >
                            📝 Resume Wawancara (AI)
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                          >
                            {activeData.history.resume}
                          </Typography>
                        </Box>
                      )}
                    </Card>
                    <Box
                      component="form"
                      onSubmit={handleFinalResumeSubmit}
                      sx={{
                        width: "100%",
                        mb: 3,
                        p: { xs: 2.5, sm: 3 },
                        border: "1px solid #e2e8f0",
                        borderRadius: 3,
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Stack spacing={2}>
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, mb: 0.5 }}
                          >
                            ✍️ Final Resume
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tulis final resume untuk disimpan ke kolom
                            finalResume pada tabel interview.
                          </Typography>
                        </Box>
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          maxRows={6}
                          value={finalResume}
                          onChange={(event) =>
                            setFinalResume(event.target.value)
                          }
                          placeholder="Contoh: Kandidat menunjukkan pemahaman yang baik, komunikasi cukup jelas, dan layak untuk lanjut ke tahap berikutnya."
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: "#fafbfc",
                            },
                          }}
                        />
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={!(finalResume || persistedFinalResume).trim()}
                            sx={{
                              px: 4,
                              py: 1.2,
                              fontWeight: 700,
                              borderRadius: 2,
                              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                            }}
                          >
                            Submit Final Resume
                          </Button>
                        </Stack>
                        {submittedFinalResume && (
                          <Alert severity="success" sx={{ borderRadius: 2 }}>
                            Final resume tersimpan.
                          </Alert>
                        )}
                      </Stack>
                    </Box>
                    <Chip
                      label="✓ Sesi wawancara telah selesai"
                      color="success"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        padding: "20px 24px",
                      }}
                    />
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Timeout Notification */}
          {skippedNotification && (
            <Box
              sx={{
                mx: { xs: 2, sm: 3 },
                mb: 1,
                px: 2,
                py: 1.2,
                bgcolor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                animation: "fadeIn 0.3s ease",
                "@keyframes fadeIn": {
                  from: { opacity: 0, transform: "translateY(-6px)" },
                  to: { opacity: 1, transform: "translateY(0)" },
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: "#ef4444", fontWeight: 600 }}
              >
                ⏰ Waktu habis! Pertanyaan dilewati secara otomatis.
              </Typography>
            </Box>
          )}

          {/* Input Area */}
          {!isFinished && (
            <Box
              component="form"
              onSubmit={formik.handleSubmit}
              sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <Stack spacing={2}>
                {/* Timer */}
                {isTimerActive && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        position: "relative",
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="44"
                        height="44"
                        style={{ transform: "rotate(-90deg)" }}
                      >
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke={
                            timeLeft <= 10
                              ? "#ef4444"
                              : timeLeft <= 30
                                ? "#f59e0b"
                                : "#10b981"
                          }
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 18}`}
                          strokeDashoffset={`${2 * Math.PI * 18 * (1 - timeLeft / ANSWER_TIME_LIMIT)}`}
                          style={{
                            transition:
                              "stroke-dashoffset 1s linear, stroke 0.5s ease",
                          }}
                        />
                      </svg>
                      <Typography
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color:
                            timeLeft <= 10
                              ? "#ef4444"
                              : timeLeft <= 30
                                ? "#f59e0b"
                                : "#10b981",
                          animation:
                            timeLeft <= 10 ? "pulse 1s infinite" : "none",
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.5 },
                          },
                        }}
                      >
                        {timeLeft}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color:
                            timeLeft <= 10
                              ? "#ef4444"
                              : timeLeft <= 30
                                ? "#f59e0b"
                                : "text.secondary",
                        }}
                      >
                        {timeLeft <= 10
                          ? "⚠️ Segera jawab! Waktu hampir habis"
                          : timeLeft <= 30
                            ? "🕐 Sisa waktu sedikit"
                            : "⏱ Waktu menjawab"}
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.5,
                          height: 4,
                          bgcolor: "#e2e8f0",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${(timeLeft / ANSWER_TIME_LIMIT) * 100}%`,
                            bgcolor:
                              timeLeft <= 10
                                ? "#ef4444"
                                : timeLeft <= 30
                                  ? "#f59e0b"
                                  : "#10b981",
                            borderRadius: 2,
                            transition:
                              "width 1s linear, background-color 0.5s ease",
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", flexShrink: 0 }}
                    >
                      {Math.floor(timeLeft / 60)}:
                      {String(timeLeft % 60).padStart(2, "0")}
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  maxRows={5}
                  minRows={2}
                  id="answer"
                  name="answer"
                  placeholder="Ketik jawaban Anda di sini... (Tekan Ctrl+Enter atau klik tombol Kirim)"
                  value={formik.values.answer}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      e.preventDefault();
                      formik.handleSubmit();
                    }
                  }}
                  error={formik.touched.answer && Boolean(formik.errors.answer)}
                  helperText={formik.touched.answer && formik.errors.answer}
                  disabled={
                    formik.isSubmitting || isLoading || isSubmittingAnswer
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#fafbfc",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "#10b981",
                      },
                      "&.Mui-focused": {
                        borderColor: "#10b981",
                        backgroundColor: "#ffffff",
                      },
                    },
                  }}
                />
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: "flex-end" }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={
                      formik.isSubmitting ||
                      isLoading ||
                      isSubmittingAnswer ||
                      !formik.values.answer.trim()
                    }
                    sx={{
                      px: 4,
                      py: 1.2,
                      fontWeight: 700,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    {formik.isSubmitting || isSubmittingAnswer ? (
                      <>
                        <CircularProgress size={20} color="inherit" />
                        Mengirim...
                      </>
                    ) : (
                      "▶️ Kirim Jawaban"
                    )}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Card>
      </Container>

      {/* Exit Fullscreen Warning Dialog */}
      <Dialog
        open={showExitWarning}
        onClose={() => setShowExitWarning(false)}
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.2rem", pb: 1 }}>
          ⚠️ Wawancara Masih Berlangsung
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography>
            Anda tidak dapat keluar dari mode fullscreen sampai sesi wawancara
            selesai. Harap selesaikan semua pertanyaan terlebih dahulu.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setShowExitWarning(false)}
            variant="contained"
            color="primary"
          >
            Saya Mengerti
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
