"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Skeleton,
  Grid,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ListIcon from "@mui/icons-material/List";
import Navigation from "@/components/navigation";
import { api, type ApiResponse } from "@/lib/api";

type Interview = {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  finalResume: string | null;
  user: {
    id: number;
    name: string;
    username: string;
  };
  company: { name: string };
  position: { name: string };
  focusQuestions: { categoryId: number }[];
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: interviews, isLoading } = useSWR(
    session?.accessToken ? ["admin-interviews", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<Interview[]>>(
        "/interviews/admin/all",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data || [];
    }
  );

  const statusColor = (status: string) => {
    return status === "FINISH" ? "success" : "warning";
  };

  const statusLabel = (status: string) => {
    return status === "FINISH" ? "Selesai" : "Berlangsung";
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

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 6 }, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        <Stack spacing={3} sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                Kelola Lamaran
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: "1.05rem" }}>
                Kelola lamaran wawancara dan evaluasi kandidat.
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Card sx={{ border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
              <ListIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Daftar Lamaran
              </Typography>
            </Stack>

            {isLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
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
                        backgroundColor: inv.status === "FINISH" ? "rgba(16, 185, 129, 0.03)" : "rgba(245, 158, 11, 0.03)",
                      }}
                      onClick={() => router.push(`/admin/interviews/${inv.id}`)}
                    >
                      <Stack spacing={1.5}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {inv.position?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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

                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <Typography variant="body2" color="text.secondary">
                            Kandidat:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {inv.user?.name}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Typography>

                        {inv.status === "FINISH" && (
                          <Chip
                            size="small"
                            label={inv.finalResume ? "Resume Final Ada" : "Resume Final Belum Ada"}
                            color={inv.finalResume ? "success" : "default"}
                            variant="outlined"
                            sx={{ mt: 1, fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary" sx={{ mb: 2, fontSize: "1.05rem" }}>
                  Belum ada lamaran yang tercatat.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
