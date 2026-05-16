"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { interviewService } from "@/services/interviewService";

export default function InterviewChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const interviewId = parseInt(id, 10);
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  const fetcher = async ([, , token]: [string, number, string]) => {
    const history = await interviewService.getInterviewHistory(interviewId, token);
    let currentQ = null;
    if (history?.status !== "FINISH") {
      currentQ = await interviewService.getCurrentQuestion(interviewId, token);
    }
    return { history, currentQ };
  };

  const { data, error, isLoading, mutate } = useSWR(
    session?.accessToken ? ["interview", interviewId, session.accessToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  const formik = useFormik({
    initialValues: { answer: "" },
    validationSchema: Yup.object({
      answer: Yup.string().required("Jawaban tidak boleh kosong"),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!session?.accessToken || !data?.currentQ) return;
      try {
        await interviewService.submitAnswer(interviewId, values.answer, data.currentQ.id, session.accessToken);
        resetForm();
        mutate();
      } catch (error) {
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
        if (data?.history?.status === "FINISH") {
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

  type MessageType = {
    sender: "AI" | "USER";
    text: string;
    id: string | number;
    scoreObj?: { score: number; reason: string; type: "technical" | "softskill" } | null;
  };
  const messages: MessageType[] = [];

  const isFinished = data?.history?.status === "FINISH";
  const totalQuestions = data?.history?.answers?.length ?? 0;
  
  let totalScore = 0;
  let scoredAnswersCount = 0;
  const summaryPoints: string[] = [];

  if (data?.history) {
    data.history.answers.forEach((ans) => {
      messages.push({
        sender: "AI",
        text: ans.question.content,
        id: `q-${ans.question.id}-${ans.id}`,
      });
      
      let scoreObj = null;
      const categoryName = (ans.question as any).category?.name || ans.question.type;
      
      if (ans.technicalScore) {
        scoreObj = { score: ans.technicalScore.finalScore, reason: ans.technicalScore.feedback || ans.technicalScore.reason || "", type: "technical" as const };
        totalScore += ans.technicalScore.finalScore;
        scoredAnswersCount++;
        const feedback = ans.technicalScore.reason || ans.technicalScore.feedback;
        if (feedback) {
          summaryPoints.push(`[${categoryName}] ${feedback}`);
        }
      } else if (ans.softSkillScore) {
        scoreObj = { score: ans.softSkillScore.finalScore, reason: ans.softSkillScore.reason || "", type: "softskill" as const };
        totalScore += (ans.softSkillScore.finalScore / 5) * 100;
        scoredAnswersCount++;
        if (ans.softSkillScore.reason) {
          summaryPoints.push(`[${categoryName}] ${ans.softSkillScore.reason}`);
        }
      }

      messages.push({
        sender: "USER",
        text: ans.content,
        id: `a-${ans.id}`,
        scoreObj,
      });
    });

    if (data.currentQ) {
      messages.push({
        sender: "AI",
        text: data.currentQ.content,
        id: `q-current-${data.currentQ.id}`,
      });
    }
  }

  const overallScore = scoredAnswersCount > 0 ? Math.round(totalScore / scoredAnswersCount) : 0;

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
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
          <Box sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
          }}>
            <Stack direction="row" sx={{justifyContent: 'space-between', alignItems: 'start'}} spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  🎤 Sesi Wawancara
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Jawab pertanyaan dengan jelas dan profesional.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                <IconButton
                  onClick={toggleFullscreen}
                  size="small"
                  title={isFullscreen ? "Keluar Fullscreen" : "Masuk Fullscreen"}
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
                  label={isFinished ? "✓ Selesai" : `Pertanyaan ${totalQuestions + (messages.length > 0 ? 1 : 0)}`}
                  color={isFinished ? "success" : "primary"}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Stack>
          </Box>

          {/* Progress Bar */}
          {!isFinished && (
            <Box sx={{
              height: 4,
              background: "#e2e8f0",
              position: "relative",
              overflow: "hidden",
            }}>
              <Box sx={{
                height: "100%",
                background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                width: `${Math.min((totalQuestions / 10) * 100, 95)}%`,
                transition: "width 0.3s ease",
              }} />
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
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6 }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography color="text.secondary">Memuat data wawancara...</Typography>
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
                    <Box key={msg.id} sx={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      gap: 1.5,
                      animation: "slideIn 0.3s ease",
                      "@keyframes slideIn": {
                        from: {
                          opacity: 0,
                          transform: isUser ? "translateX(20px)" : "translateX(-20px)",
                        },
                        to: {
                          opacity: 1,
                          transform: "translateX(0)",
                        },
                      },
                    }}>
                      {!isUser && (
                        <Avatar sx={{
                          bgcolor: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          width: 40,
                          height: 40,
                          fontWeight: 700,
                          fontSize: "1rem",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                          flexShrink: 0,
                        }}>
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
                        <Typography sx={{
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                          fontSize: { xs: "0.95rem", sm: "1rem" },
                        }}>
                          {msg.text}
                        </Typography>
                        {isUser && isFinished && msg.scoreObj && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "rgba(255, 255, 255, 0.15)", borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5, color: "#fff" }}>
                              Skor Jawaban: {Math.round(msg.scoreObj.score)}/{msg.scoreObj.type === "softskill" ? "5" : "100"}
                            </Typography>
                            {msg.scoreObj.reason && (
                              <Typography variant="body2" sx={{ opacity: 0.9, color: "#fff" }}>
                                {msg.scoreObj.reason}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                      {isUser && (
                        <Avatar sx={{
                          bgcolor: "#059669",
                          width: 40,
                          height: 40,
                          fontWeight: 700,
                          fontSize: "1rem",
                          boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                          flexShrink: 0,
                        }}>
                          👤
                        </Avatar>
                      )}
                    </Box>
                  );
                })}
                {isFinished && (
                  <Box sx={{ pt: 3, pb: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Card
                      elevation={0}
                      sx={{
                        width: "100%",
                        border: "1px solid #e2e8f0",
                        borderRadius: 3,
                        mb: 3,
                        overflow: "hidden"
                      }}
                    >
                      <Box sx={{ p: 2.5, bgcolor: "rgba(16, 185, 129, 0.08)", borderBottom: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#059669" }}>
                          📊 Hasil Penilaian Wawancara
                        </Typography>
                        <Chip label={`Skor Keseluruhan: ${overallScore}/100`} color="primary" sx={{ fontWeight: 800, fontSize: "1.05rem", py: 2.5, px: 1 }} />
                      </Box>
                      <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                          📝 Ringkasan Evaluasi
                        </Typography>
                        <Stack spacing={2}>
                          {summaryPoints.length > 0 ? summaryPoints.map((point, idx) => (
                            <Box key={idx} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                              <Typography color="primary" sx={{ fontWeight: 800, mt: "-2px" }}>•</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{point}</Typography>
                            </Box>
                          )) : (
                            <Typography variant="body2" color="text.secondary">Belum ada ringkasan yang tersedia.</Typography>
                          )}
                        </Stack>
                      </Box>
                      {data?.history?.resume && (
                        <Box sx={{ p: { xs: 2.5, sm: 3.5 }, borderTop: "1px solid #e2e8f0" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                            📝 Resume Wawancara (AI)
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                            {data.history.resume}
                          </Typography>
                        </Box>
                      )}
                    </Card>
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
                  disabled={formik.isSubmitting || isLoading}
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
                <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={formik.isSubmitting || isLoading || !formik.values.answer.trim()}
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
                    {formik.isSubmitting ? (
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
            Anda tidak dapat keluar dari mode fullscreen sampai sesi wawancara selesai. Harap selesaikan semua pertanyaan terlebih dahulu.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setShowExitWarning(false)} variant="contained" color="primary">
            Saya Mengerti
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
