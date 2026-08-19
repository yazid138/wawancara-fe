"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
  Checkbox,
  ListItemText,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ListIcon from "@mui/icons-material/List";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Navigation from "@/components/navigation";
import { api, type ApiResponse } from "@/lib/api";

type Category = {
  id: number;
  name: string;
};

type Position = {
  id: number;
  companyId: number;
  name: string;
};

type JobOpening = {
  id: number;
  name: string;
  description: string | null;
  companyId: number;
  positionId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company: { id: number; name: string };
  position: { id: number; name: string };
  categories: { categoryId: number; category: Category }[];
  _count: { interviews: number };
};

export default function CompanyPage() {
  const { data: session } = useSession();
  const isCompany = session?.user?.role === "COMPANY";
  const isAdmin = session?.user?.role === "ADMIN";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPositionName, setFormPositionName] = useState("");
  const [formCategoryIds, setFormCategoryIds] = useState<number[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const swrKey = isCompany
    ? session?.accessToken
      ? ["job-openings-company", session.accessToken]
      : null
    : session?.accessToken
      ? ["job-openings-all", session.accessToken]
      : null;

  const fetcher = async ([, accessToken]: [string, string]) => {
    const url = isCompany ? "/job-openings/company" : "/job-openings/all";
    const response = await api.get<ApiResponse<JobOpening[]>>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.data || [];
  };

  const { data: jobOpenings, isLoading, mutate } = useSWR(swrKey, fetcher);

  const { data: categories } = useSWR(
    session?.accessToken ? ["categories", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<Category[]>>("/questions/categories", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data.data || [];
    }
  );

  const { data: positions } = useSWR(
    session?.accessToken ? ["positions", session.accessToken] : null,
    async ([, accessToken]) => {
      const response = await api.get<ApiResponse<Position[]>>("/position", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data.data || [];
    }
  );

  const handleOpenCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDescription("");
    setFormPositionName("");
    setFormCategoryIds([]);
    setFormIsActive(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (jo: JobOpening) => {
    setEditId(jo.id);
    setFormName(jo.name);
    setFormDescription(jo.description || "");
    setFormPositionName(jo.position.name);
    setFormCategoryIds(jo.categories.map((c) => c.categoryId));
    setFormIsActive(jo.isActive);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError("Nama wajib diisi");
      return;
    }
    if (!formPositionName.trim()) {
      setFormError("Posisi wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        positionName: formPositionName.trim(),
        categoryIds: formCategoryIds,
        isActive: formIsActive,
      };

      if (editId) {
        await api.put(`/job-openings/${editId}`, body, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
      } else {
        await api.post("/job-openings", body, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
      }

      setDialogOpen(false);
      mutate();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Gagal menyimpan";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus lamaran ini?")) return;
    try {
      await api.delete(`/job-openings/${id}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      mutate();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menghapus");
    }
  };

  if (!isCompany && !isAdmin) {
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
                {isCompany ? "Kelola Lamaran" : "Lamaran HR"}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: "1.05rem" }}>
                {isCompany
                  ? "Kelola lamaran dan atur kategori pertanyaan untuk kandidat."
                  : "Lihat semua lamaran yang dibuat oleh HR."}
              </Typography>
            </Box>
            {isCompany && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{ fontWeight: 700 }}
              >
                Buat Lamaran
              </Button>
            )}
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
            ) : jobOpenings && jobOpenings.length > 0 ? (
              <Grid container spacing={2}>
                {jobOpenings.map((jo) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={jo.id}>
                    <Paper
                      sx={{
                        p: 2.5,
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        height: "100%",
                        transition: "all 0.3s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 8px 24px rgba(16, 185, 129, 0.12)",
                        },
                        backgroundColor: jo.isActive ? "transparent" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {jo.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {jo.company?.name} — {jo.position?.name}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            {isCompany && (
                              <>
                                <IconButton size="small" onClick={() => handleOpenEdit(jo)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => handleDelete(jo.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          <Chip
                            size="small"
                            label={jo.isActive ? "Aktif" : "Nonaktif"}
                            color={jo.isActive ? "success" : "default"}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip
                            size="small"
                            label={`${jo._count.interviews} kandidat`}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>

                        {jo.categories.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                            {jo.categories.map((c) => (
                              <Chip
                                key={c.categoryId}
                                size="small"
                                label={c.category.name}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            ))}
                          </Stack>
                        )}

                        {jo.description && (
                          <Typography variant="body2" color="text.secondary">
                            {jo.description}
                          </Typography>
                        )}

                        <Typography variant="caption" color="text.secondary">
                          {new Date(jo.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Typography>
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
                {isCompany && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    sx={{ fontWeight: 600 }}
                  >
                    Buat Lamaran Pertama
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editId ? "Edit Lamaran" : "Buat Lamaran Baru"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {formError && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 2,
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                {formError}
              </Alert>
            )}

            <TextField
              label="Nama Lamaran"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Deskripsi (opsional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              label="Posisi"
              value={formPositionName}
              onChange={(e) => setFormPositionName(e.target.value)}
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Kategori Pertanyaan</InputLabel>
              <Select
                multiple
                value={formCategoryIds}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormCategoryIds(
                    typeof value === "string" ? value.split(",").map(Number) : (value as number[])
                  );
                }}
                input={<OutlinedInput label="Kategori Pertanyaan" />}
                renderValue={(selected) =>
                  (categories || [])
                    .filter((c) => selected.includes(c.id))
                    .map((c) => c.name)
                    .join(", ")
                }
                sx={{ borderRadius: 2 }}
              >
                {(categories || []).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    <Checkbox checked={formCategoryIds.includes(cat.id)} />
                    <ListItemText primary={cat.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {editId && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Aktif"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 600 }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ fontWeight: 700 }}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
