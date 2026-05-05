"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 16,
        mx: "auto",
        width: "min(100%, 1120px)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: 4,
        backdropFilter: "blur(18px)",
        backgroundColor: "rgba(255, 255, 255, 0.82)",
        color: "text.primary",
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 72, gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ flex: 1, alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(145deg, #0f766e, #0f172a)",
                color: "white",
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              W
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                Wawancara
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dashboard & autentikasi
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            {session?.user ? (
              <>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {session.user.name ?? session.user.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {session.user.role}
                    </Typography>
                </Box>
                <Button
                  component={Link}
                  href="/"
                  variant="text"
                  color="inherit"
                  sx={{ fontWeight: 700 }}
                >
                  Dashboard
                </Button>
                <Button
                  component={Link}
                  href="/internship-applications"
                  variant="text"
                  color="inherit"
                  sx={{ fontWeight: 700 }}
                >
                  Lamar Magang
                </Button>
                <Button
                  component={Link}
                  href="/Interview"
                  variant="text"
                  color="inherit"
                  sx={{ fontWeight: 700 }}
                >
                  Interview
                </Button>
                <Button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  variant="contained"
                  sx={{ fontWeight: 700 }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                component={Link}
                href="/login"
                variant="contained"
                sx={{ fontWeight: 700 }}
              >
                Login
              </Button>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}