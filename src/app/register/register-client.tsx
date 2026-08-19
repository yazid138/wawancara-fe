"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { api, type ApiResponse } from "@/lib/api";

const registerSchema = Yup.object({
  name: Yup.string().required("Nama wajib diisi"),
  username: Yup.string().min(3, "Minimal 3 karakter").required("Username wajib diisi"),
  password: Yup.string().min(5, "Minimal 5 karakter").required("Password wajib diisi"),
});

export default function RegisterClient() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      username: "",
      password: "",
    },
    validationSchema: registerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null);
      setSubmitSuccess(null);

      try {
        await api.post<ApiResponse<any>>("/auth/register", {
          name: values.name,
          username: values.username,
          password: values.password,
          role: "STUDENT",
        });

        setSubmitSuccess("Pendaftaran berhasil! Mengarahkan ke halaman login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Gagal melakukan pendaftaran";
        setSubmitError(message);
        helpers.setSubmitting(false);
      }
    },
  });

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        background: "linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-50%",
            right: "-50%",
            width: "200%",
            height: "200%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "float 20s infinite linear",
          },
        }}
      >
        <Stack
          spacing={4}
          sx={{ maxWidth: 540, position: "relative", zIndex: 1 }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                opacity: 0.9,
                letterSpacing: 3,
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              WAWANCARA PLATFORM
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                mt: 2,
                lineHeight: 1.2,
                fontSize: { xs: "2rem", sm: "2.5rem" },
              }}
            >
              Simulasi Wawancara Magang
            </Typography>
          </Box>
          <Typography
            sx={{ fontSize: "1.05rem", lineHeight: 1.8, opacity: 0.92 }}
          >
            Daftar untuk berlatih wawancara magang dengan AI. Dapatkan
            evaluasi otomatis dan feedback komprehensif.
          </Typography>
          <Divider flexItem sx={{ borderColor: "rgba(255,255,255,0.25)" }} />
          <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.25)",
                color: "white",
                width: 48,
                height: 48,
              }}
            >
              ✓
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
                Gratis & Terbuka
              </Typography>
              <Typography sx={{ opacity: 0.85, fontSize: "0.95rem", mt: 0.5 }}>
                Akses gratis untuk mahasiswa yang ingin berlatih wawancara
                magang.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
        }}
      >
        <Card
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 480,
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.08)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Stack
              spacing={3.5}
              component="form"
              onSubmit={formik.handleSubmit}
              noValidate
            >
              <Stack spacing={1}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Daftar Akun
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                  Buat akun mahasiswa untuk mengakses simulasi wawancara.
                </Typography>
              </Stack>

              {submitError && (
                <Alert
                  severity="error"
                  sx={{
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
                    borderRadius: 2,
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  {submitSuccess}
                </Alert>
              )}

              <TextField
                id="name"
                name="name"
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap Anda"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name ? formik.errors.name : " "}
                autoComplete="name"
                fullWidth
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                id="username"
                name="username"
                label="Username"
                placeholder="Masukkan username Anda"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.username && Boolean(formik.errors.username)
                }
                helperText={
                  formik.touched.username ? formik.errors.username : " "
                }
                autoComplete="username"
                fullWidth
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                id="password"
                name="password"
                label="Password"
                placeholder="Masukkan password Anda"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.password && Boolean(formik.errors.password)
                }
                helperText={
                  formik.touched.password ? formik.errors.password : " "
                }
                autoComplete="new-password"
                fullWidth
                size="medium"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={formik.isSubmitting}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: "1rem",
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                {formik.isSubmitting ? (
                  <>
                    <CircularProgress size={20} color="inherit" />
                    Memproses...
                  </>
                ) : (
                  "Daftar Sekarang"
                )}
              </Button>

              <Typography
                sx={{
                  textAlign: "center",
                  fontSize: "0.85rem",
                  color: "text.secondary",
                }}
              >
                Sudah punya akun?{" "}
                <Link
                  href="/login"
                  style={{
                    color: "#10b981",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Masuk di sini
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0px); }
          50% { transform: translate(30px, 30px); }
          100% { transform: translate(0, 0px); }
        }
      `}</style>
    </Box>
  );
}
