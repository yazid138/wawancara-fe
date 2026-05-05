"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  Popover,
  MenuItem,
  Paper,
} from "@mui/material";

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await signOut({ callbackUrl: "/login" });
  };

  const getInitials = () => {
    const name = session?.user?.name ?? session?.user?.username ?? "U";
    return name.charAt(0).toUpperCase();
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const getNavLinkStyle = (href: string) => ({
    fontWeight: 600,
    fontSize: "0.9rem",
    px: 1.5,
    py: 1,
    borderRadius: 2,
    position: "relative",
    transition: "all 0.3s",
    color: isActive(href) ? "primary.main" : "inherit",
    backgroundColor: isActive(href) ? "rgba(16, 185, 129, 0.1)" : "transparent",
    // "&::after": isActive(href) ? {
    //   content: '""',
    //   position: "absolute",
    //   bottom: -8,
    //   left: 0,
    //   right: 0,
    //   height: 3,
    //   background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    //   borderRadius: "3px 3px 0 0",
    // } : {},
    "&:hover": {
      backgroundColor: "rgba(16, 185, 129, 0.08)",
      color: "primary.main",
    },
  });

  const getMenuItemStyle = (href: string) => ({
    borderRadius: 1.5,
    mb: 0.5,
    backgroundColor: isActive(href) ? "rgba(16, 185, 129, 0.1)" : "transparent",
    color: isActive(href) ? "primary.main" : "inherit",
    fontWeight: isActive(href) ? 700 : 600,
    "&:hover": {
      backgroundColor: "rgba(16, 185, 129, 0.08)",
      color: "primary.main",
    },
  });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 16,
        mx: "auto",
        width: "min(100%, calc(100% - 32px))",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        backdropFilter: "blur(20px)",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        color: "text.primary",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 68, gap: 2, justifyContent: "space-between" }}>
          {/* Logo Section */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                fontWeight: 800,
                letterSpacing: -0.5,
                fontSize: "1.25rem",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
              }}
            >
              W
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                Wawancara
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                Interview Platform
              </Typography>
            </Box>
          </Stack>

          {/* Center Navigation Links */}
          {session?.user && (
            <Stack
              direction="row"
              spacing={0}
              sx={{
                alignItems: "center",
                display: { xs: "none", md: "flex" },
              }}
            >
              <Button
                component={Link}
                href="/"
                variant="text"
                color="inherit"
                sx={getNavLinkStyle("/")}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                href="/internship-applications"
                variant="text"
                color="inherit"
                sx={getNavLinkStyle("/internship-applications")}
              >
                Lamar
              </Button>
            </Stack>
          )}

          {/* Right Section - User Profile / Login Button */}
          <Box>
            {session?.user ? (
              <>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                    },
                  }}
                  onClick={handleClick}
                >
                  <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {session.user.name ?? session.user.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      {session.user.role}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                </Stack>

                {/* Popover Menu */}
                <Popover
                  id="user-menu"
                  open={open}
                  anchorEl={anchorEl}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
                        mt: 1,
                      },
                    },
                  }}
                >
                  <Paper
                    sx={{
                      minWidth: 200,
                      overflow: "hidden",
                    }}
                  >
                    {/* User Info Section */}
                    <Box sx={{ p: 2, backgroundColor: "rgba(16, 185, 129, 0.05)", borderBottom: "1px solid #e2e8f0" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {session.user.name ?? session.user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.user.role}
                      </Typography>
                    </Box>

                    {/* Menu Items */}
                    <Stack sx={{ p: 1 }}>
                      <MenuItem
                        component={Link}
                        href="/"
                        onClick={handleClose}
                        sx={getMenuItemStyle("/")}
                      >
                        <Typography sx={{ fontWeight: isActive("/") ? 700 : 600 }}>
                          {isActive("/") ? "✓ " : ""}📊 Dashboard
                        </Typography>
                      </MenuItem>
                      <MenuItem
                        component={Link}
                        href="/internship-applications"
                        onClick={handleClose}
                        sx={getMenuItemStyle("/internship-applications")}
                      >
                        <Typography sx={{ fontWeight: isActive("/internship-applications") ? 700 : 600 }}>
                          {isActive("/internship-applications") ? "✓ " : ""}💼 Lamar Magang
                        </Typography>
                      </MenuItem>

                      <Divider sx={{ my: 1 }} />

                      <MenuItem
                        onClick={handleLogout}
                        sx={{
                          borderRadius: 1.5,
                          color: "error.main",
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>🚪 Logout</Typography>
                      </MenuItem>
                    </Stack>
                  </Paper>
                </Popover>
              </>
            ) : (
              <Button
                component={Link}
                href="/login"
                variant="contained"
                color="primary"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  py: 1,
                  px: 3,
                  borderRadius: 2,
                }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}