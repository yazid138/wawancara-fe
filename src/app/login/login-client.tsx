"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
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
} from "@mui/material";

const loginSchema = Yup.object({
  username: Yup.string().required("Username wajib diisi"),
  password: Yup.string().min(5, "Minimal 5 karakter").required("Password wajib diisi"),
});

export default function LoginClient() {
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") ?? "/", [searchParams]);

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
    },
    validationSchema: loginSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null);
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setSubmitError(result.error);
        helpers.setSubmitting(false);
        return;
      }

      window.location.href = result?.url ?? callbackUrl;
    },
  });

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
          background:
            "linear-gradient(145deg, rgba(15, 118, 110, 0.96), rgba(15, 23, 42, 0.98))",
          color: "white",
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 540 }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 4 }}>
              Wawancara Platform
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, mt: 1 }}>
              Masuk untuk mengelola interview, pertanyaan, dan scoring.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 18, lineHeight: 1.8, opacity: 0.92 }}>
            Gunakan akun yang sudah terdaftar di backend. Session akan disimpan oleh
            NextAuth dan halaman lain akan dilindungi lewat proxy.
          </Typography>
          <Divider flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
          <Stack direction="row" spacing={2}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "white" }}>A</Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Credentials Login</Typography>
              <Typography sx={{ opacity: 0.82 }}>
                Username dan password divalidasi sebelum diproses ke API Express.
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
            border: "1px solid rgba(15, 23, 42, 0.08)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3} component="form" onSubmit={formik.handleSubmit} noValidate>
              <Stack spacing={1}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Login
                </Typography>
                <Typography color="text.secondary">
                  Masukkan kredensial untuk masuk ke dashboard.
                </Typography>
              </Stack>

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}

              <TextField
                id="username"
                name="username"
                label="Username"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.username && Boolean(formik.errors.username)}
                helperText={formik.touched.username ? formik.errors.username : " "}
                autoComplete="username"
                fullWidth
              />

              <TextField
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password ? formik.errors.password : " "}
                autoComplete="current-password"
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={formik.isSubmitting}
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                {formik.isSubmitting ? "Memproses..." : "Masuk"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}