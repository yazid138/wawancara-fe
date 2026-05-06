"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Skeleton,
  Stack,
  Typography,
  Divider,
  Grid,
  Paper,
} from "@mui/material";
import { api, type ApiResponse } from "@/lib/api";
import Navigation from "@/components/navigation";

type Interview = {
  id: number;
  status: string;
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
  company: { name: string };
  position: { name: string };
};

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: interviews, isLoading: loadingInterviews } = useSWR(
    session?.accessToken ? ["interviews", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<Interview[]>>("/interviews", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data || [];
    },
  );

  const statusColor = (status: string) => {
    return status === "FINISH" ? "success" : "warning";
  };

  const statusLabel = (status: string) => {
    return status === "FINISH" ? "Selesai" : "Berlangsung";
  };

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

        {/* Header Section */}
        <Stack spacing={3} sx={{ mb: 5 }}>
          <Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Selamat datang, {session?.user?.name ?? "Pengguna"}!
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 1.5, fontSize: "1.05rem" }}
            >
              Kelola wawancara, pertanyaan, dan penilaian calon magang dengan
              mudah.
            </Typography>
          </Box>
        </Stack>

        {/* Interview History */}
        <Box sx={{ mt: 4 }}>
          <Card sx={{ border: "1px solid #e2e8f0" }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                📝 Riwayat Interview
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mb: 3, fontSize: "0.95rem" }}
              >
                Daftar semua interview yang telah atau sedang Anda ikuti.
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              {loadingInterviews ? (
                <Stack spacing={2}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      height={100}
                      sx={{ borderRadius: 2 }}
                    />
                  ))}
                </Stack>
              ) : interviews && interviews.length > 0 ? (
                <Grid container spacing={2}>
                  {interviews.map((inv) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={inv.id}>
                      <Paper
                        sx={{
                          p: 2.5,
                          border: "1px solid #e2e8f0",
                          borderRadius: 2,
                          height: "100%",
                          transition: "all 0.3s",
                          cursor: "pointer",
                          "&:hover": {
                            borderColor: "primary.main",
                            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.12)",
                            transform: "translateY(-2px)",
                          },
                          backgroundColor:
                            inv.status === "FINISH"
                              ? "rgba(16, 185, 129, 0.03)"
                              : "rgba(245, 158, 11, 0.03)",
                        }}
                        onClick={() => router.push(`/interview/${inv.id}`)}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 800 }}
                              >
                                {inv.position?.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                {inv.company?.name}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={statusLabel(inv.status)}
                              color={statusColor(inv.status) as any}
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>

                          <Divider />

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Progress: {inv.currentIndex} / soal
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color:
                                  inv.status === "FINISH"
                                    ? "success.main"
                                    : "warning.main",
                              }}
                            >
                              {inv.status === "FINISH"
                                ? "✓ Selesai"
                                : "→ Berlangsung"}
                            </Typography>
                          </Box>

                          <Button
                            variant={
                              inv.status === "FINISH" ? "outlined" : "contained"
                            }
                            color="primary"
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            {inv.status === "FINISH"
                              ? "👁️ Lihat Hasil"
                              : "▶️ Lanjutkan"}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography
                    color="text.secondary"
                    sx={{ mb: 2, fontSize: "1.05rem" }}
                  >
                    📭 Anda belum mengikuti interview apapun.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push("/internship-applications")}
                  >
                    Mulai Lamar Magang
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
