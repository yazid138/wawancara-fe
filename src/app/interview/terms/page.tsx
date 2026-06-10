"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import Navigation from "@/components/navigation";
import { api, type ApiResponse } from "@/lib/api";

type StartInterviewResponse = {
  id: number;
  userId: number;
  companyId: number;
  positionId: number;
  status?: string | null;
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
};

const QUESTION_CATEGORY_OPTIONS = [
  "Personal",
  "Motivation",
  "Teamwork",
  "Time Management",
  "Adaptability",
  "Stress Management",
  "Backend",
  "Database",
  "Security",
  "Communication",
  "Problem Solving",
  "Leadership",
  "Personality",
  "Self Confidence",
];

function TermsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [agreed, setAgreed] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const positionId = searchParams.get("positionId");
  const companyId = searchParams.get("companyId");

  const handleStart = async () => {
    if (!agreed) {
      setError("Anda harus menyetujui syarat dan ketentuan untuk melanjutkan.");
      return;
    }

    if (selectedCategories.length < 3) {
      setError("Pilih minimal 3 kategori pertanyaan untuk melanjutkan.");
      return;
    }

    if (!positionId || !companyId) {
      setError("Data posisi atau perusahaan tidak valid.");
      return;
    }

    if (!session?.accessToken) {
      setError("Session login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<ApiResponse<StartInterviewResponse>>(
        "/interviews",
        {
          companyId: Number(companyId),
          positionId: Number(positionId),
          questionCategories: selectedCategories,
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      const interview = response.data.data;
      if (interview?.id) {
        router.push(`/interview/${interview.id}`);
      } else {
        throw new Error("Gagal mendapatkan ID interview.");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Gagal membuat sesi interview.");
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}
    >
      <Box
        sx={{ p: 4, bgcolor: "primary.main", color: "primary.contrastText" }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Syarat dan Ketentuan Wawancara
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
          Harap baca dengan saksama sebelum memulai sesi wawancara Anda.
        </Typography>
      </Box>

      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box
            sx={{
              bgcolor: "background.default",
              p: 3,
              borderRadius: 2,
              border: "1px solid #e2e8f0",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Ketentuan Umum
            </Typography>
            <ol style={{ paddingLeft: "20px", margin: 0, lineHeight: "1.8" }}>
              <li>
                <Typography variant="body1">
                  <strong>Kejujuran:</strong> Anda wajib menjawab setiap
                  pertanyaan dengan jujur berdasarkan pengalaman dan kemampuan
                  Anda sendiri.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Kemandirian:</strong> Sesi wawancara ini harus
                  diselesaikan secara mandiri tanpa bantuan dari pihak ketiga,
                  termasuk penggunaan AI eksternal atau alat pencarian lainnya.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Konektivitas:</strong> Pastikan Anda memiliki koneksi
                  internet yang stabil selama sesi wawancara berlangsung.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Etika Profesional:</strong> Gunakan bahasa yang
                  profesional dan sopan selama berinteraksi dengan sistem
                  wawancara.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Kerahasiaan:</strong> Anda dilarang untuk menyebarkan,
                  membagikan, atau merekam pertanyaan-pertanyaan wawancara
                  kepada pihak luar.
                </Typography>
              </li>
            </ol>
          </Box>

          <Box
            sx={{
              bgcolor: "background.default",
              p: 3,
              borderRadius: 2,
              border: "1px solid #e2e8f0",
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Pilih Kategori Pertanyaan
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pilih minimal 3 kategori yang ingin difokuskan dalam sesi
                  wawancara.
                </Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="question-category-label">
                  Kategori Pertanyaan
                </InputLabel>
                <Select
                  labelId="question-category-label"
                  multiple
                  value={selectedCategories}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedCategories(
                      typeof value === "string" ? value.split(",") : value,
                    );
                    if (error) setError(null);
                  }}
                  input={<OutlinedInput label="Kategori Pertanyaan" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {selected.map((item) => (
                        <Chip key={item} label={item} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {QUESTION_CATEGORY_OPTIONS.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography
                variant="body2"
                sx={{
                  color:
                    selectedCategories.length >= 3
                      ? "success.main"
                      : "text.secondary",
                  fontWeight: 600,
                }}
              >
                {selectedCategories.length}/3 kategori dipilih
              </Typography>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  color="primary"
                />
              }
              label={
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Saya telah membaca, memahami, dan menyetujui seluruh syarat
                  dan ketentuan di atas.
                </Typography>
              }
            />
          </Box>

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2 }}
          >
            <Button
              variant="outlined"
              onClick={() => router.back()}
              disabled={loading}
              sx={{ fontWeight: 600 }}
            >
              Kembali
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleStart}
              disabled={loading || !agreed || selectedCategories.length < 3}
              sx={{ fontWeight: 700, px: 4 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Memproses...
                </>
              ) : (
                "Setuju dan Mulai Interview"
              )}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function TermsPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 3, md: 6 },
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        <Suspense
          fallback={
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <CircularProgress />
            </Box>
          }
        >
          <TermsContent />
        </Suspense>
      </Container>
    </Box>
  );
}
