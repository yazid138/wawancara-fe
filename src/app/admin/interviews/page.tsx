"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  IconButton,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { api } from "@/lib/api";

type Interview = {
  id: number;
  userId: number;
  companyId: number;
  positionId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; username: string };
  company: { id: number; name: string };
  position: { id: number; name: string };
  focusQuestions: { categoryId: number; category: { name: string } }[];
};

type Company = { id: number; name: string };
type Position = { id: number; name: string; companyId: number };
type QuestionCategory = { id: number; name: string };
type Student = { id: number; name: string; username: string };

export default function AdminInterviewsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [questionCategories, setQuestionCategories] = useState<QuestionCategory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    userId: 0,
    companyId: 0,
    positionId: 0,
    categoryIds: [] as number[],
  });

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [interviewsRes, companiesRes, positionsRes, categoriesRes, studentsRes] =
        await Promise.all([
          api.get("/interviews/admin/all"),
          api.get("/company"),
          api.get("/position"),
          api.get("/questions/categories"),
          api.get("/auth/students"),
        ]);

      setInterviews(interviewsRes.data.data || []);
      setCompanies(companiesRes.data.data || []);
      setPositions(positionsRes.data.data || []);
      setQuestionCategories(categoriesRes.data.data || []);
      setStudents(studentsRes.data.data || []);
    } catch (err) {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingInterview(null);
    setFormData({
      userId: 0,
      companyId: 0,
      positionId: 0,
      categoryIds: [],
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (interview: Interview) => {
    setEditingInterview(interview);
    setFormData({
      userId: interview.userId,
      companyId: interview.companyId,
      positionId: interview.positionId,
      categoryIds: interview.focusQuestions.map((fq) => fq.categoryId),
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInterview(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.userId || !formData.companyId || !formData.positionId) {
      setError("Semua field wajib diisi");
      return;
    }

    try {
      setError("");
      if (editingInterview) {
        await api.put(`/interviews/${editingInterview.id}`, {
          userId: formData.userId,
          companyId: formData.companyId,
          positionId: formData.positionId,
        });
        await api.patch(`/interviews/${editingInterview.id}/focus-categories`, {
          categoryIds: formData.categoryIds,
        });
        setSuccess("Lamaran berhasil diupdate");
      } else {
        await api.post("/interviews/admin", {
          userId: formData.userId,
          companyId: formData.companyId,
          positionId: formData.positionId,
          categoryIds: formData.categoryIds,
        });
        setSuccess("Lamaran berhasil dibuat");
      }
      handleCloseDialog();
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan lamaran");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/interviews/${deletingId}`);
      setSuccess("Lamaran berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus lamaran");
    }
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "student",
      headerName: "Mahasiswa",
      width: 150,
      valueGetter: (params: any) => params.row.user?.name || "-",
    },
    {
      field: "company",
      headerName: "Perusahaan",
      width: 150,
      valueGetter: (params: any) => params.row.company?.name || "-",
    },
    {
      field: "position",
      headerName: "Posisi",
      width: 150,
      valueGetter: (params: any) => params.row.position?.name || "-",
    },
    {
      field: "categories",
      headerName: "Kategori",
      width: 250,
      renderCell: (params: any) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {params.row.focusQuestions?.map((fq: any, idx: number) => (
            <Chip key={idx} label={fq.category?.name} size="small" />
          ))}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value === "FINISH" ? "Selesai" : "Berlangsung"}
          color={params.value === "FINISH" ? "success" : "warning"}
          size="small"
        />
      ),
    },
    {
      field: "createdAt",
      headerName: "Tanggal",
      width: 120,
      valueGetter: (params: any) =>
        new Date(params.row.createdAt).toLocaleDateString("id-ID"),
    },
    {
      field: "actions",
      headerName: "Aksi",
      width: 120,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenEdit(params.row)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setDeletingId(params.row.id);
              setDeleteDialogOpen(true);
            }}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Kelola Lamaran
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              Tambah Lamaran
            </Button>
          </Box>

          {success && <Alert severity="success">{success}</Alert>}
          {error && !openDialog && <Alert severity="error">{error}</Alert>}

          <Card>
            <CardContent>
              <DataGrid
                rows={interviews}
                columns={columns}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                autoHeight
              />
            </CardContent>
          </Card>
        </Stack>

        {/* Dialog Create/Edit */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingInterview ? "Edit Lamaran" : "Tambah Lamaran"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <FormControl fullWidth>
                <InputLabel>Mahasiswa</InputLabel>
                <Select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: Number(e.target.value) })}
                  label="Mahasiswa"
                >
                  <MenuItem value={0} disabled>
                    Pilih Mahasiswa
                  </MenuItem>
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name} ({student.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Perusahaan</InputLabel>
                <Select
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData({ ...formData, companyId: Number(e.target.value) })
                  }
                  label="Perusahaan"
                >
                  <MenuItem value={0} disabled>
                    Pilih Perusahaan
                  </MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Posisi</InputLabel>
                <Select
                  value={formData.positionId}
                  onChange={(e) =>
                    setFormData({ ...formData, positionId: Number(e.target.value) })
                  }
                  label="Posisi"
                >
                  <MenuItem value={0} disabled>
                    Pilih Posisi
                  </MenuItem>
                  {positions
                    .filter((p) => !formData.companyId || p.companyId === formData.companyId)
                    .map((position) => (
                      <MenuItem key={position.id} value={position.id}>
                        {position.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Kategori Pertanyaan</InputLabel>
                <Select
                  multiple
                  value={formData.categoryIds}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryIds: e.target.value as number[] })
                  }
                  input={<OutlinedInput label="Kategori Pertanyaan" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const category = questionCategories.find((c) => c.id === value);
                        return <Chip key={value} label={category?.name} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {questionCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Checkbox checked={formData.categoryIds.indexOf(category.id) > -1} />
                      <ListItemText primary={category.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Batal</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingInterview ? "Update" : "Buat"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Konfirmasi Hapus</DialogTitle>
          <DialogContent>
            <Typography>Apakah Anda yakin ingin menghapus lamaran ini?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Hapus
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
