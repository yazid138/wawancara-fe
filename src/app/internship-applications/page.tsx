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

    try {
      const response = await api.post<ApiResponse<StartInterviewResponse>>(
        "/interviews",
        {
          companyId,
          positionId,
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      const interview = response.data.data;
      setSubmitSuccess(
        interview
          ? `Lamaran berhasil dibuat. Interview ID: ${interview.id}`
          : "Lamaran berhasil dibuat.",
      );
      
      if (interview?.id) {
        router.push(`/interview/${interview.id}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Gagal mengirim lamaran magang.");
      }
    } finally {
      setLoadingPositionId(null);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        <Card
          elevation={0}
          sx={{
            mb: 4,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(240,253,250,0.9))",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={1}>
              <Chip label="Lamar Magang" color="primary" sx={{ width: "fit-content", fontWeight: 700 }} />
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Halo, {applicantName}
              </Typography>
              <Typography color="text.secondary">
                Pilih posisi dan perusahaan di bawah ini untuk memulai proses wawancara.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {submitError ? <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert> : null}
        {submitSuccess ? <Alert severity="success" sx={{ mb: 3 }}>{submitSuccess}</Alert> : null}

        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            Lowongan Tersedia
          </Typography>

          {loadingPositions ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : positionsError ? (
            <Alert severity="error">Gagal memuat lowongan posisi.</Alert>
          ) : positions && positions.length > 0 ? (
            <Grid container spacing={3}>
              {positions.map((pos) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pos.id}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
                        {pos.company?.name || "Perusahaan Anonim"}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.3 }}>
                        {pos.name}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleApply(pos.id, pos.companyId)}
                        disabled={loadingPositionId === pos.id}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        {loadingPositionId === pos.id ? <CircularProgress size={24} color="inherit" /> : "Lamar & Mulai Interview"}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 8 }}>
              Belum ada posisi yang tersedia saat ini.
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}