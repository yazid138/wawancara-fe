"use client";

import { useState, Suspense, useEffect } from "react";
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
  Stack,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
  Chip,
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

function TermsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  const positionId = searchParams.get("positionId");

  useEffect(() => {
    if (!session?.accessToken) return;
    const fetchCategories = async () => {
      try {
        const response = await api.get<ApiResponse<{ id: number; name: string }[]>>(
          "/questions/categories",
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );
        setCategories(response.data.data || []);
      } catch (err) {
        console.error("Gagal mengambil kategori:", err);
      } finally {
        setFetchingCategories(false);
      }
    };
    fetchCategories();
  }, [session?.accessToken]);
  const companyId = searchParams.get("companyId");

  const handleStart = async () => {
    if (selectedCategories.length < 3) {
      setError("Silakan pilih minimal 3 kategori pertanyaan untuk melanjutkan.");
      return;
    }

    if (!agreed) {
      setError("Anda harus menyetujui syarat dan ketentuan untuk melanjutkan.");
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
          categoryIds: selectedCategories,
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Gagal mengirim lamaran magang.");
      }
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ p: 4, bgcolor: "primary.main", color: "primary.contrastText" }}>
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

          <Box sx={{ bgcolor: "background.default", p: 3, borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Ketentuan Umum
            </Typography>
            <ol style={{ paddingLeft: "20px", margin: 0, lineHeight: "1.8" }}>
              <li>
                <Typography variant="body1">
                  <strong>Kejujuran:</strong> Anda wajib menjawab setiap pertanyaan dengan jujur berdasarkan pengalaman dan kemampuan Anda sendiri.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Kemandirian:</strong> Sesi wawancara ini harus diselesaikan secara mandiri tanpa bantuan dari pihak ketiga, termasuk penggunaan AI eksternal atau alat pencarian lainnya.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Konektivitas:</strong> Pastikan Anda memiliki koneksi internet yang stabil selama sesi wawancara berlangsung.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Etika Profesional:</strong> Gunakan bahasa yang profesional dan sopan selama berinteraksi dengan sistem wawancara.
                </Typography>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Kerahasiaan:</strong> Anda dilarang untuk menyebarkan, membagikan, atau merekam pertanyaan-pertanyaan wawancara kepada pihak luar.
                </Typography>
              </li>
            </ol>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Pilih Kategori Pertanyaan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pilih minimal 3 kategori pertanyaan yang ingin Anda hadapi selama wawancara (pertanyaan Intro & General akan otomatis muncul).
            </Typography>
            {fetchingCategories ? (
              <CircularProgress size={24} />
            ) : (
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="category-select-label">Kategori Pertanyaan</InputLabel>
                <Select
                  labelId="category-select-label"
                  id="category-select"
                  multiple
                  value={selectedCategories}
                  onChange={(e) => {
                    const value = e.target.value as number[];
                    setSelectedCategories(value);
                  }}
                  input={<OutlinedInput label="Kategori Pertanyaan" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const cat = categories.find(c => c.id === value);
                        return <Chip key={value} label={cat ? cat.name : value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Checkbox checked={selectedCategories.indexOf(cat.id) > -1} />
                      <ListItemText primary={cat.name} sx={{ textTransform: 'capitalize' }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
                  Saya telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan di atas.
                </Typography>
              }
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2 }}>
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
              disabled={loading || !agreed}
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
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 6 }, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />
        
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        }>
          <TermsContent />
        </Suspense>
      </Container>
    </Box>
  );
}
