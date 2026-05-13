"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Stack,
  CardActions,
  Paper,
  Divider,
} from "@mui/material";
import Navigation from "@/components/navigation";
import { api, type ApiResponse } from "@/lib/api";

type BackendUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  createdAt: string;
};

type Position = {
  id: number;
  companyId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: number;
    name: string;
  };
};

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

export default function InternshipApplicationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [loadingPositionId, setLoadingPositionId] = useState<number | null>(null);

  const { data: profile } = useSWR(
    session?.accessToken ? ["me", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<BackendUser>>("/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data;
    },
  );

  const { data: positions, error: positionsError, isLoading: loadingPositions } = useSWR(
    session?.accessToken ? ["positions", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<Position[]>>("/position", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data.data || [];
    }
  );

  const { data: interviews, isLoading: loadingInterviews } = useSWR(
    session?.accessToken ? ["interviews", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<any[]>>("/interviews", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data.data || [];
    }
  );

  const applicantName = useMemo(
    () => profile?.name ?? session?.user?.name ?? "Calon Magang",
    [profile?.name, session?.user?.name],
  );

  const handleApply = async (positionId: number, companyId: number) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    
    if (!session?.accessToken) {
      setSubmitError("Session login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoadingPositionId(positionId);

    // Redirect to terms and conditions page
    setTimeout(() => {
      router.push(`/interview/terms?positionId=${positionId}&companyId=${companyId}`);
      setLoadingPositionId(null);
    }, 500);
  };

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 6 }, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        {/* Header */}
        <Card
          elevation={0}
          sx={{
            mb: 5,
            border: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
            "&:hover": {
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
            },
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4.5 } }}>
            <Stack spacing={2}>
              <Box>
                <Chip
                  label="Lamar Magang"
                  sx={{
                    mb: 2,
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    color: "primary.main",
                    fontWeight: 600,
                  }}
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Halo, {applicantName}! 👋
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: "1.05rem", maxWidth: 600 }}>
                Pilih posisi dan perusahaan di bawah untuk memulai proses wawancara interaktif dengan AI. Jawab setiap pertanyaan dengan jujur dan profesional.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Alerts */}
        {submitError && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 2,
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {submitError}
          </Alert>
        )}
        {submitSuccess && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderRadius: 2,
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            {submitSuccess}
          </Alert>
        )}

        {/* Positions Section */}
        <Box>
          <Stack spacing={1} sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              💼 Lowongan Tersedia
            </Typography>
            <Typography color="text.secondary">
              {positions?.length ?? 0} posisi tersedia untuk Anda
            </Typography>
          </Stack>

          {loadingPositions ? (
            <Box sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 12,
            }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography color="text.secondary">Memuat lowongan posisi...</Typography>
            </Box>
          ) : positionsError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Gagal memuat lowongan posisi. Silakan coba lagi.
            </Alert>
          ) : positions && positions.length > 0 ? (
            <Grid container spacing={3}>
              {positions.map((pos, idx) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={pos.id}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid #e2e8f0",
                      borderRadius: 3,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        borderColor: "primary.main",
                        boxShadow: "0 20px 40px rgba(16, 185, 129, 0.15)",
                      },
                      animation: `slideIn 0.5s ease ${idx * 50}ms forwards`,
                      opacity: 0,
                      "@keyframes slideIn": {
                        from: {
                          opacity: 0,
                          transform: "translateY(20px)",
                        },
                        to: {
                          opacity: 1,
                          transform: "translateY(0)",
                        },
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                      <Stack spacing={2}>
                        {/* Company Badge */}
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.8rem" }}>
                            🏢 PERUSAHAAN
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                            {pos.company?.name || "Perusahaan"}
                          </Typography>
                        </Paper>

                        <Divider sx={{ my: 0.5 }} />

                        {/* Position */}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem" }}>
                            💼 POSISI
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              mt: 0.5,
                              lineHeight: 1.3,
                              color: "text.primary",
                            }}
                          >
                            {pos.name}
                          </Typography>
                        </Box>

                        {/* Metadata */}
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #e2e8f0" }}>
                          <Chip
                            size="small"
                            label="Interview AI"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              backgroundColor: "rgba(16, 185, 129, 0.05)",
                              borderColor: "primary.main",
                            }}
                          />
                          <Chip
                            size="small"
                            label="Segera"
                            variant="filled"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                      </Stack>
                    </CardContent>

                    <Divider />

                    <CardActions sx={{ p: 2, pt: 2 }}>
                      {interviews?.some(inv => inv.positionId === pos.id && inv.companyId === pos.companyId) ? (
                        <Button
                          variant="outlined"
                          color="inherit"
                          fullWidth
                          disabled
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            py: 1.2,
                            fontSize: "0.95rem",
                          }}
                        >
                          ✓ Sudah Terdaftar
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={() => handleApply(pos.id, pos.companyId)}
                          disabled={loadingPositionId === pos.id || loadingInterviews}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            py: 1.2,
                            fontSize: "0.95rem",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          {loadingPositionId === pos.id ? (
                            <>
                              <CircularProgress size={18} color="inherit" />
                              Memproses...
                            </>
                          ) : (
                            "▶️ Mulai Interview"
                          )}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper
              elevation={0}
              sx={{
                textAlign: "center",
                py: 10,
                border: "2px dashed #e2e8f0",
                borderRadius: 3,
                backgroundColor: "rgba(16, 185, 129, 0.02)",
              }}
            >
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                📭 Belum ada posisi yang tersedia
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                Silakan cek kembali nanti atau hubungi administrator.
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </Box>
  );
}