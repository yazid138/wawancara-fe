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

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Navigation />
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 4, display: "flex", flexDirection: "column" }}>
        <Card
          elevation={0}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "rgba(255,255,255,0.9)" }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Sesi Wawancara
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Jawab pertanyaan dari AI dengan jelas dan komprehensif.
            </Typography>
          </Box>

          {/* Chat Area */}
          <Box sx={{ flexGrow: 1, p: 3, overflowY: "auto", bgcolor: "rgba(248, 250, 252, 0.5)" }}>
            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">Gagal memuat data wawancara.</Alert>
            ) : messages.length === 0 && !isFinished ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Belum ada pesan.
              </Typography>
            ) : (
              <Stack spacing={3}>
                {messages.map((msg) => {
                  const isUser = msg.sender === "USER";
                  return (
                    <Box key={msg.id} sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 2 }}>
                      {!isUser && (
                        <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontWeight: 700, fontSize: "0.9rem" }}>
                          AI
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          px: 3,
                          maxWidth: "75%",
                          borderRadius: 3,
                          borderTopRightRadius: isUser ? 0 : 3,
                          borderTopLeftRadius: !isUser ? 0 : 3,
                          bgcolor: isUser ? "primary.main" : "white",
                          color: isUser ? "primary.contrastText" : "text.primary",
                          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                          border: isUser ? "none" : "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.text}</Typography>
                      </Paper>
                      {isUser && (
                        <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36, fontWeight: 700, fontSize: "0.9rem" }}>
                          U
                        </Avatar>
                      )}
                    </Box>
                  );
                })}
                {isFinished && (
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                    <Chip label="Sesi wawancara telah selesai" color="success" variant="outlined" />
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>

          {/* Input Area */}
          {!isFinished && (
            <Box
              component="form"
              onSubmit={formik.handleSubmit}
              sx={{ p: 2, borderTop: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "white" }}
            >
              <Box sx={{ display: "flex", flexDirection: "row", gap: 2, alignItems: "flex-end" }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  minRows={1}
                  id="answer"
                  name="answer"
                  placeholder="Ketik jawaban Anda di sini..."
                  value={formik.values.answer}
                  onChange={formik.handleChange}
                  error={formik.touched.answer && Boolean(formik.errors.answer)}
                  helperText={formik.touched.answer && formik.errors.answer}
                  disabled={formik.isSubmitting || isLoading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      bgcolor: "rgba(248, 250, 252, 0.8)",
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={formik.isSubmitting || isLoading || !formik.values.answer.trim()}
                  sx={{ borderRadius: 3, minWidth: 100, height: 56, mb: formik.errors.answer ? 3 : 0 }}
                >
                  {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Kirim"}
                </Button>
              </Box>
            </Box>
          )}
        </Card>
      </Container>
    </Box>
  );
}
