"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Box,
  Card,
  Container,
  Typography,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Navigation from "@/components/navigation";
import { interviewService, type InterviewHistory } from "@/services/interviewService";
import { api, type ApiResponse } from "@/lib/api";

type QuestionCategory = {
  id: number;
  name: string;
};

export default function AdminInterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const interviewId = parseInt(id, 10);
  const { data: session } = useSession();

  const [finalResume, setFinalResume] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [saveResumeSuccess, setSaveResumeSuccess] = useState(false);
  const [saveResumeError, setSaveResumeError] = useState("");

  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [saveCategoriesSuccess, setSaveCategoriesSuccess] = useState(false);
  const [saveCategoriesError, setSaveCategoriesError] = useState("");

  const { data: history, isLoading } = useSWR(
    session?.accessToken ? ["admin-interview-detail", interviewId, session.accessToken] : null,
    async ([, interviewId, accessToken]) => {
      const hist = await interviewService.getInterviewHistory(interviewId, accessToken);
      if (!hist) throw new Error("Gagal mengambil riwayat wawancara");
      return hist;
    },
  );

  useEffect(() => {
    if (history?.finalResume) {
      setFinalResume(history.finalResume);
    }
  }, [history?.finalResume]);

  useEffect(() => {
    if (history?.focusQuestions) {
      setSelectedCategories(history.focusQuestions.map((fq: any) => fq.categoryId));
    }
  }, [history]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const fetchCategories = async () => {
      try {
        const response = await api.get<ApiResponse<QuestionCategory[]>>(
          "/questions/categories",
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        );
        setCategories(response.data.data || []);
      } catch (err) {
        console.error("Gagal mengambil kategori:", err);
      }
    };
    fetchCategories();
  }, [session?.accessToken]);

  const handleSaveResume = async () => {
    if (!session?.accessToken) return;
    try {
      setIsSavingResume(true);
      setSaveResumeSuccess(false);
      setSaveResumeError("");
      await interviewService.updateFinalResume(interviewId, finalResume, session.accessToken);
      setSaveResumeSuccess(true);
    } catch (error) {
      setSaveResumeError("Gagal menyimpan resume final.");
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleSaveCategories = async () => {
    if (!session?.accessToken) return;
    try {
      setIsSavingCategories(true);
      setSaveCategoriesSuccess(false);
      setSaveCategoriesError("");
      await api.patch(
        `/interviews/${interviewId}/focus-categories`,
        { categoryIds: selectedCategories },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      setSaveCategoriesSuccess(true);
    } catch (error) {
      setSaveCategoriesError("Gagal menyimpan kategori.");
    } finally {
      setIsSavingCategories(false);
    }
  };

  if (session?.user?.role !== "ADMIN") {
    return (
      <Box sx={{ minHeight: "100vh", py: 6, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Navigation />
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
              Akses Ditolak
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!history) {
    return (
      <Box sx={{ minHeight: "100vh", py: 6, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Navigation />
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
              Wawancara tidak ditemukan
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 6 }, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/admin")}
          sx={{ mb: 3 }}
        >
          Kembali ke Dashboard
        </Button>

        <Stack spacing={3}>
          <Card sx={{ border: "1px solid #e2e8f0" }}>
            <Box sx={{ p: 3, bgcolor: "primary.main", color: "primary.contrastText" }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Detail Wawancara
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                Kandidat: {history.user?.name} - {history.position?.name} @ {history.company?.name}
              </Typography>
            </Box>

            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Chip
                  label={`Status: ${history.status}`}
                  color={history.status === "FINISH" ? "success" : "warning"}
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                  ID: #{interviewId}
                </Typography>
              </Stack>
            </Box>
          </Card>

          {history.status !== "FINISH" && (
            <Card sx={{ border: "1px solid #e2e8f0" }}>
              <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Atur Kategori Pertanyaan
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pilih kategori pertanyaan yang akan diajukan dalam wawancara ini.
                </Typography>
              </Box>

              <Box sx={{ p: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Kategori Pertanyaan</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={(e) => {
                      const value = e.target.value as number[];
                      setSelectedCategories(value);
                      setSaveCategoriesSuccess(false);
                    }}
                    input={<OutlinedInput label="Kategori Pertanyaan" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => {
                          const cat = categories.find((c) => c.id === value);
                          return <Chip key={value} label={cat?.name || value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        <Checkbox checked={selectedCategories.indexOf(cat.id) > -1} />
                        <ListItemText primary={cat.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {saveCategoriesSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Kategori berhasil disimpan!
                  </Alert>
                )}
                {saveCategoriesError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {saveCategoriesError}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveCategories}
                  disabled={isSavingCategories}
                  sx={{ mt: 2 }}
                >
                  {isSavingCategories ? <CircularProgress size={24} /> : "Simpan Kategori"}
                </Button>
              </Box>
            </Card>
          )}

          {history.status === "FINISH" && (
            <>
              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Riwayat Wawancara
                  </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {history.chatHistories?.map((chat: any, idx: number) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: chat.role === "AI" ? "flex-start" : "flex-end",
                        }}
                      >
                        <Chip
                          size="small"
                          label={chat.role}
                          color={chat.role === "AI" ? "primary" : "default"}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography
                          variant="body1"
                          sx={{
                            p: 2,
                            bgcolor: chat.role === "AI" ? "rgba(16, 185, 129, 0.1)" : "rgba(0, 0, 0, 0.04)",
                            borderRadius: 2,
                            maxWidth: "80%",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {chat.content}
                        </Typography>
                        {chat.answer?.score && (
                          <Box sx={{ mt: 1, p: 1.5, bgcolor: "rgba(255, 255, 255, 0.8)", borderRadius: 1, border: "1px solid #e2e8f0" }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                              Skor: {Math.round(chat.answer.score.finalScore)}/100
                            </Typography>
                            {chat.answer.score.feedback && (
                              <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">
                                {chat.answer.score.feedback}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Card>

              {history.resume && (
                <Card sx={{ border: "1px solid #e2e8f0" }}>
                  <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Resume AI
                    </Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                      {history.resume}
                    </Typography>
                  </Box>
                </Card>
              )}

              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Resume Final (HR)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tulis evaluasi akhir untuk kandidat. Resume ini akan ditampilkan kepada kandidat.
                  </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    maxRows={15}
                    placeholder="Masukkan resume final hasil wawancara di sini..."
                    value={finalResume}
                    onChange={(e) => {
                      setFinalResume(e.target.value);
                      setSaveResumeSuccess(false);
                    }}
                    disabled={isSavingResume}
                  />

                  {saveResumeSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Resume final berhasil disimpan!
                    </Alert>
                  )}
                  {saveResumeError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {saveResumeError}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveResume}
                    disabled={isSavingResume || !finalResume.trim()}
                    sx={{ mt: 2 }}
                  >
                    {isSavingResume ? <CircularProgress size={24} /> : "Simpan Resume Final"}
                  </Button>
                </Box>
              </Card>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
