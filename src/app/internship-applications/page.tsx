"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
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

const applicationSchema = Yup.object({
  companyId: Yup.number()
    .typeError("Company ID harus berupa angka")
    .integer("Company ID harus bilangan bulat")
    .positive("Company ID harus lebih dari 0")
    .required("Company ID wajib diisi"),
  positionId: Yup.number()
    .typeError("Position ID harus berupa angka")
    .integer("Position ID harus bilangan bulat")
    .positive("Position ID harus lebih dari 0")
    .required("Position ID wajib diisi"),
});

export default function InternshipApplicationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const applicantName = useMemo(
    () => profile?.name ?? session?.user?.name ?? "Calon Magang",
    [profile?.name, session?.user?.name],
  );

  const formik = useFormik({
    initialValues: {
      companyId: "",
      positionId: "",
    },
    validationSchema: applicationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null);
      setSubmitSuccess(null);

      if (!session?.accessToken) {
        setSubmitError("Session login tidak ditemukan. Silakan login ulang.");
        helpers.setSubmitting(false);
        return;
      }

      try {
        const response = await api.post<ApiResponse<StartInterviewResponse>>(
          "/interviews",
          {
            companyId: Number(values.companyId),
            positionId: Number(values.positionId),
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
        helpers.resetForm();

        if (interview?.id) {
          router.refresh();
        }
      } catch (error) {
        if (error instanceof Error) {
          setSubmitError(error.message);
        } else {
          setSubmitError("Gagal mengirim lamaran magang.");
        }
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Navigation />
        <Box sx={{ height: 24 }} />

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
            alignItems: "stretch",
          }}
        >
          <Card
            elevation={0}
            sx={{
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(240,253,250,0.9))",
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Stack spacing={3} component="form" onSubmit={formik.handleSubmit} noValidate>
                <Stack spacing={1}>
                  <Chip label="Lamar Magang" sx={{ width: "fit-content" }} />
                  <Typography variant="h3" sx={{ fontWeight: 800 }}>
                    Ajukan magang untuk {applicantName}
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
                    Backend saat ini memakai endpoint `POST /interviews` untuk memulai
                    proses lamar/interview. Isi `companyId` dan `positionId` yang valid
                    dari data seed/admin.
                  </Typography>
                </Stack>

                <Divider />

                {submitError ? <Alert severity="error">{submitError}</Alert> : null}
                {submitSuccess ? <Alert severity="success">{submitSuccess}</Alert> : null}

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  }}
                >
                  <TextField
                    id="companyId"
                    name="companyId"
                    label="Company ID"
                    type="number"
                    value={formik.values.companyId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.companyId && Boolean(formik.errors.companyId)}
                    helperText={formik.touched.companyId ? formik.errors.companyId : " "}
                    fullWidth
                  />

                  <TextField
                    id="positionId"
                    name="positionId"
                    label="Position ID"
                    type="number"
                    value={formik.values.positionId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.positionId && Boolean(formik.errors.positionId)}
                    helperText={formik.touched.positionId ? formik.errors.positionId : " "}
                    fullWidth
                  />
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={formik.isSubmitting}
                    sx={{ fontWeight: 700, px: 3 }}
                  >
                    {formik.isSubmitting ? "Mengirim..." : "Kirim Lamaran"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push("/")}
                    sx={{ fontWeight: 700, px: 3 }}
                  >
                    Kembali ke Dashboard
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255,255,255,0.82)",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={1.5}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Data Kandidat
                  </Typography>
                  <Typography color="text.secondary">
                    Data ini diambil dari session dan diverifikasi ulang ke backend.
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Username
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {profile?.username ?? session?.user?.username ?? "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Role
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {profile?.role ?? session?.user?.role ?? "-"}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background:
                  "linear-gradient(160deg, rgba(15,118,110,0.08), rgba(15,23,42,0.04))",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Catatan API
                  </Typography>
                  <Typography color="text.secondary">
                    Endpoint yang dipakai adalah `POST /interviews` dengan payload
                    `companyId` dan `positionId`. Jika kamu ingin daftar perusahaan/
                    posisi muncul sebagai dropdown, backend perlu endpoint list untuk
                    `Company` dan `Position`.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}