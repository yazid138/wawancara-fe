"use client";

import useSWR from "swr";
import { signOut, useSession } from "next-auth/react";
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

export default function Home() {
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

          <Box>
            <Card
              elevation={0}
              sx={{
                minHeight: "100%",
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
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
