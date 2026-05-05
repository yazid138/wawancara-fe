"use client";

import { use, useEffect, useRef } from "react";
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
} from "@mui/material";
import Navigation from "@/components/navigation";
import { interviewService } from "@/services/interviewService";

export default function InterviewChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const interviewId = parseInt(id, 10);
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetcher = async ([, token]: [string, string]) => {
    const history = await interviewService.getInterviewHistory(interviewId, token);
    let currentQ = null;
    if (history?.status !== "FINISH") {
      currentQ = await interviewService.getCurrentQuestion(interviewId, token);
    }
    return { history, currentQ };
  };

  const { data, error, isLoading, mutate } = useSWR(
    session?.accessToken ? ["interview", session.accessToken] : null,
    fetcher
  );

  const formik = useFormik({
    initialValues: { answer: "" },
    validationSchema: Yup.object({
      answer: Yup.string().required("Jawaban tidak boleh kosong"),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!session?.accessToken) return;
      try {
        await interviewService.submitAnswer(interviewId, values.answer, session.accessToken);
        resetForm();
        mutate();
      } catch (error) {
        console.error("Gagal mengirim jawaban", error);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data]);

  const messages: { sender: "AI" | "USER"; text: string; id: string | number }[] = [];

  if (data?.history) {
    data.history.answers.forEach((ans) => {
      messages.push({
        sender: "AI",
        text: ans.question.content,
        id: `q-${ans.question.id}-${ans.id}`,
      });
      messages.push({
        sender: "USER",
        text: ans.content,
        id: `a-${ans.id}`,
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

  const isFinished = data?.history?.status === "FINISH";
  const totalQuestions = data?.history?.answers?.length ?? 0;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Navigation />
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3, display: "flex", flexDirection: "column" }}>
        <Card
          elevation={0}
          sx={{
            flexGrow: 1,
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
            <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  🎤 Sesi Wawancara
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Jawab pertanyaan dengan jelas dan profesional.
                </Typography>
              </Box>
              <Chip
                label={isFinished ? "✓ Selesai" : `Pertanyaan ${totalQuestions + (messages.length > 0 ? 1 : 0)}`}
                color={isFinished ? "success" : "primary"}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
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
          <Box sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3.5 },
            overflowY: "auto",
            bgcolor: "#fafbfc",
            display: "flex",
            flexDirection: "column",
          }}>
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
                          borderTopRightRadius: isUser ? 4 : 3,
                          borderTopLeftRadius: !isUser ? 4 : 3,
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
                  <Box sx={{
                    display: "flex",
                    justifyContent: "center",
                    pt: 3,
                    pb: 1,
                  }}>
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
    </Box>
  );
}
