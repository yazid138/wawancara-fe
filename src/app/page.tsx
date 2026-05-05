"use client";

import useSWR from "swr";
import { signOut, useSession } from "next-auth/react";
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
} from "@mui/material";
import { api, type ApiResponse } from "@/lib/api";
import Navigation from "@/components/navigation";

type BackendUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  createdAt: string;
};

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
  const { data: session, status } = useSession();

  const { data, error, isLoading } = useSWR(
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

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
            alignItems: "stretch",
          }}
        >
          <Box>
            <Card
              elevation={0}
              sx={{
                minHeight: "100%",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(239,246,255,0.92))",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Chip label={status === "loading" ? "Memuat sesi" : "Dashboard"} sx={{ width: "fit-content" }} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>
                      {session?.user?.name ?? "Pengguna"}
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
                      {session?.user?.role
                        ? `Role aktif: ${session.user.role}. Data di bawah diambil dari endpoint /auth/me memakai token NextAuth.`
                        : "Session belum tersedia."}
                    </Typography>
                  </Stack>

                  {error ? <Alert severity="error">Gagal mengambil data profil dari backend.</Alert> : null}

                  <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                    <Button variant="contained" onClick={() => signOut({ callbackUrl: "/login" })}>
                      Logout
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    }}
                  >
                    <Box>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardContent>
                          <Typography variant="overline" color="text.secondary">
                            Username
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {isLoading ? <Skeleton width="60%" /> : data?.username ?? session?.user?.username}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                    <Box>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardContent>
                          <Typography variant="overline" color="text.secondary">
                            Role
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {isLoading ? <Skeleton width="50%" /> : data?.role ?? session?.user?.role}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255,255,255,0.8)",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                <Stack spacing={2}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Detail Akun
                  </Typography>
                  <Typography color="text.secondary">
                    Informasi ini diambil dari sesi NextAuth dan diverifikasi ulang ke backend.
                  </Typography>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ID
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {isLoading ? <Skeleton width="40%" /> : data?.id ?? session?.user?.id}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Nama
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {isLoading ? <Skeleton width="70%" /> : data?.name ?? session?.user?.name}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Dibuat
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {isLoading ? <Skeleton width="60%" /> : data?.createdAt ?? session?.user?.createdAt}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                <Stack spacing={2}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Riwayat Interview
                  </Typography>
                  
                  {loadingInterviews ? (
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  ) : interviews && interviews.length > 0 ? (
                    <Stack spacing={2}>
                      {interviews.map((inv) => (
                        <Card key={inv.id} variant="outlined" sx={{ borderRadius: 3 }}>
                          <CardContent sx={{ pb: 1 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {inv.position?.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={inv.status === "FINISH" ? "Selesai" : "Berlangsung"}
                                color={inv.status === "FINISH" ? "success" : "warning"}
                                variant={inv.status === "FINISH" ? "outlined" : "filled"}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {inv.company?.name}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => router.push(`/interview/${inv.id}`)}
                            >
                              {inv.status === "FINISH" ? "Lihat Hasil" : "Lanjutkan"}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      Anda belum mengikuti interview apapun. Silakan buka menu Lamar Magang.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
