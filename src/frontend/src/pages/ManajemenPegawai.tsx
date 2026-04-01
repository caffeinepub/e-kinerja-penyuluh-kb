import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Employee } from "../backend";
import { Gender, Role, Status } from "../backend";
import {
  useAllEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useUpdateEmployee,
} from "../hooks/useQueries";

const JABATAN_OPTIONS = [
  "Penyuluh KB Ahli Pertama",
  "Penyuluh KB Ahli Muda",
  "Penyuluh KB Ahli Madya",
  "Penyuluh KB Terampil",
  "PKB Koordinator",
  "Kepala Bidang",
];

const EMPTY_EMP: Omit<Employee, "id" | "createdAt" | "updatedAt"> = {
  nip: "",
  fullName: "",
  birthPlace: "",
  birthDate: 0n,
  gender: Gender.male,
  position: "",
  region: "",
  phone: "",
  email: "",
  role: Role.penyuluh,
  status: Status.active,
};

export default function ManajemenPegawai() {
  const { data: employees = [], isLoading } = useAllEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState("");
  const [filterWilayah, setFilterWilayah] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [form, setForm] =
    useState<Omit<Employee, "id" | "createdAt" | "updatedAt">>(EMPTY_EMP);
  const [birthDateStr, setBirthDateStr] = useState("");

  // Separate wilayah fields
  const [kecamatan, setKecamatan] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [provinsi, setProvinsi] = useState("");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        !search ||
        e.fullName.toLowerCase().includes(search.toLowerCase()) ||
        e.nip.includes(search);
      const matchWilayah =
        !filterWilayah ||
        e.region.toLowerCase().includes(filterWilayah.toLowerCase());
      const matchJabatan =
        filterJabatan === "all" || e.position === filterJabatan;
      return matchSearch && matchWilayah && matchJabatan;
    });
  }, [employees, search, filterWilayah, filterJabatan]);

  const openCreate = () => {
    setEditingEmp(null);
    setForm(EMPTY_EMP);
    setBirthDateStr("");
    setKecamatan("");
    setKabupaten("");
    setProvinsi("");
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmp(emp);
    const { id: _id, createdAt: _c, updatedAt: _u, photo: _p, ...rest } = emp;
    setForm(rest);
    const d = new Date(Number(emp.birthDate) / 1_000_000);
    setBirthDateStr(d.toISOString().split("T")[0]);
    // Parse region back into 3 fields
    const parts = emp.region.split(" | ");
    setKecamatan(parts[0] ?? "");
    setKabupaten(parts[1] ?? "");
    setProvinsi(parts[2] ?? "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    const combinedRegion = [kecamatan, kabupaten, provinsi].join(" | ");
    if (!form.nip || !form.fullName || !kecamatan || !form.position) {
      toast.error("Lengkapi semua field yang diperlukan.");
      return;
    }
    const birthDate = birthDateStr
      ? BigInt(new Date(birthDateStr).getTime()) * 1_000_000n
      : 0n;
    const empData: Employee = {
      ...(editingEmp ?? {}),
      id: editingEmp?.id ?? 0n,
      createdAt: editingEmp?.createdAt ?? 0n,
      updatedAt: 0n,
      ...form,
      region: combinedRegion,
      birthDate,
    } as Employee;

    try {
      if (editingEmp) {
        await updateEmployee.mutateAsync({ id: editingEmp.id, emp: empData });
        toast.success("Data pegawai berhasil diperbarui.");
      } else {
        await createEmployee.mutateAsync(empData);
        toast.success("Pegawai baru berhasil ditambahkan.");
      }
      setModalOpen(false);
    } catch {
      toast.error("Gagal menyimpan data pegawai.");
    }
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Pegawai berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus pegawai.");
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const updated: Employee = {
      ...emp,
      status: emp.status === Status.active ? Status.inactive : Status.active,
    };
    try {
      await updateEmployee.mutateAsync({ id: emp.id, emp: updated });
      toast.success("Status pegawai diperbarui.");
    } catch {
      toast.error("Gagal memperbarui status.");
    }
  };

  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="pegawai.section">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-ocid="pegawai.search_input"
            className="pl-9"
            placeholder="Cari nama atau NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          data-ocid="pegawai.wilayah.search_input"
          className="w-48"
          placeholder="Cari wilayah..."
          value={filterWilayah}
          onChange={(e) => setFilterWilayah(e.target.value)}
        />
        <Select value={filterJabatan} onValueChange={setFilterJabatan}>
          <SelectTrigger data-ocid="pegawai.jabatan.select" className="w-52">
            <SelectValue placeholder="Filter Jabatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jabatan</SelectItem>
            {JABATAN_OPTIONS.map((j) => (
              <SelectItem key={j} value={j}>
                {j}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button data-ocid="pegawai.add.primary_button" onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Tambah Pegawai
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>NIP</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Wilayah</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="pegawai.empty_state"
                >
                  Tidak ada data pegawai
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp, idx) => (
                <TableRow
                  key={emp.id.toString()}
                  data-ocid={`pegawai.item.${idx + 1}`}
                >
                  <TableCell className="text-sm font-mono">{emp.nip}</TableCell>
                  <TableCell className="font-medium text-sm">
                    {emp.fullName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emp.position}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emp.region}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        emp.role === Role.admin
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }
                    >
                      {emp.role === Role.admin ? "Admin" : "Penyuluh"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      data-ocid={`pegawai.status.switch.${idx + 1}`}
                      checked={emp.status === Status.active}
                      onCheckedChange={() => handleToggleStatus(emp)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        data-ocid={`pegawai.edit_button.${idx + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(emp)}
                      >
                        <Edit size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            data-ocid={`pegawai.delete_button.${idx + 1}`}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-ocid="pegawai.delete.dialog">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Pegawai?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Data pegawai <strong>{emp.fullName}</strong> akan
                              dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-ocid="pegawai.delete.cancel_button">
                              Batal
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-ocid="pegawai.delete.confirm_button"
                              onClick={() => handleDelete(emp.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Employee Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="pegawai.form.modal"
        >
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? "Edit Pegawai" : "Tambah Pegawai Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>
                NIP / NIK <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="pegawai.nip.input"
                value={form.nip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nip: e.target.value }))
                }
                placeholder="NIP/NIK"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="pegawai.nama.input"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tempat Lahir</Label>
              <Input
                data-ocid="pegawai.tempatLahir.input"
                value={form.birthPlace}
                onChange={(e) =>
                  setForm((f) => ({ ...f, birthPlace: e.target.value }))
                }
                placeholder="Kota kelahiran"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input
                data-ocid="pegawai.tanggalLahir.input"
                type="date"
                value={birthDateStr}
                onChange={(e) => setBirthDateStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select
                value={form.gender}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, gender: v as Gender }))
                }
              >
                <SelectTrigger data-ocid="pegawai.gender.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Gender.male}>Laki-laki</SelectItem>
                  <SelectItem value={Gender.female}>Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Jabatan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.position}
                onValueChange={(v) => setForm((f) => ({ ...f, position: v }))}
              >
                <SelectTrigger data-ocid="pegawai.jabatan.form.select">
                  <SelectValue placeholder="Pilih jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {JABATAN_OPTIONS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>
                Kecamatan <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="pegawai.kecamatan.input"
                value={kecamatan}
                onChange={(e) => setKecamatan(e.target.value)}
                placeholder="Nama kecamatan"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Kabupaten/Kota</Label>
              <Input
                data-ocid="pegawai.kabupaten.input"
                value={kabupaten}
                onChange={(e) => setKabupaten(e.target.value)}
                placeholder="Nama kabupaten/kota"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Provinsi</Label>
              <Input
                data-ocid="pegawai.provinsi.input"
                value={provinsi}
                onChange={(e) => setProvinsi(e.target.value)}
                placeholder="Nama provinsi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>No HP</Label>
              <Input
                data-ocid="pegawai.phone.input"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="08xx"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                data-ocid="pegawai.email.input"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as Role }))
                }
              >
                <SelectTrigger data-ocid="pegawai.role.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.penyuluh}>Penyuluh</SelectItem>
                  <SelectItem value={Role.admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="pegawai.form.cancel_button"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-ocid="pegawai.form.submit_button"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
