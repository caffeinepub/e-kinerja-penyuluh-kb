import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Save, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const JABATAN_OPTIONS = [
  "Penyuluh KB Ahli Pertama",
  "Penyuluh KB Ahli Muda",
  "Penyuluh KB Ahli Madya",
  "Penyuluh KB Terampil",
  "PKB Koordinator",
  "Kepala Bidang",
];

interface EmployeeRecord {
  id: number;
  nip: string;
  fullName: string;
  birthPlace: string;
  birthDate: number;
  gender: string;
  position: string;
  region: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}

interface ProfileForm {
  fullName: string;
  nip: string;
  position: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  phone: string;
  email: string;
}

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseRegion(region: string) {
  // Region stored as "kecamatan | kabupaten | provinsi"
  const parts = region.split(" | ");
  return {
    kecamatan: parts[0] || "",
    kabupaten: parts[1] || "",
    provinsi: parts[2] || "",
  };
}

function findEmployeeByPrincipal(principal: string): EmployeeRecord | null {
  try {
    const principalMap: Record<string, number> = JSON.parse(
      localStorage.getItem("ekinerja_principal_employee") || "{}",
    );
    const empId = principalMap[principal];
    if (empId) {
      const employees: EmployeeRecord[] = JSON.parse(
        localStorage.getItem("ekinerja_employees") || "[]",
      );
      const found = employees.find((e) => e.id === empId);
      if (found) return found;
    }

    // Fallback: find via pending approvals
    const pending: Array<{
      principal: string;
      employeeData?: { nip: string };
    }> = JSON.parse(localStorage.getItem("ekinerja_pending_approvals") || "[]");
    const approval = pending.find((p) => p.principal === principal);
    if (approval?.employeeData?.nip) {
      const employees: EmployeeRecord[] = JSON.parse(
        localStorage.getItem("ekinerja_employees") || "[]",
      );
      return (
        employees.find((e) => e.nip === approval.employeeData!.nip) || null
      );
    }
  } catch {
    // ignore
  }
  return null;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { identity } = useInternetIdentity();
  const { isLocalAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    nip: "",
    position: "",
    gender: "male",
    birthDate: "",
    birthPlace: "",
    kecamatan: "",
    kabupaten: "",
    provinsi: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!open) return;
    if (isLocalAdmin) return;
    const principal = identity?.getPrincipal().toString();
    if (!principal) return;
    const emp = findEmployeeByPrincipal(principal);
    if (emp) {
      setEmployee(emp);
      const regionParsed = parseRegion(emp.region || "");
      setForm({
        fullName: emp.fullName || "",
        nip: emp.nip || "",
        position: emp.position || "",
        gender: emp.gender || "male",
        birthDate: emp.birthDate
          ? new Date(emp.birthDate).toISOString().split("T")[0]
          : "",
        birthPlace: emp.birthPlace || "",
        kecamatan: emp.kecamatan || regionParsed.kecamatan,
        kabupaten: emp.kabupaten || regionParsed.kabupaten,
        provinsi: emp.provinsi || regionParsed.provinsi,
        phone: emp.phone || "",
        email: emp.email || "",
      });
    }
  }, [open, isLocalAdmin, identity]);

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.fullName || !form.nip) {
      toast.error("Nama Lengkap dan NIP wajib diisi.");
      return;
    }
    if (!employee) {
      toast.error("Data pegawai tidak ditemukan.");
      return;
    }
    setIsSaving(true);
    try {
      const employees: EmployeeRecord[] = JSON.parse(
        localStorage.getItem("ekinerja_employees") || "[]",
      );
      const idx = employees.findIndex((e) => e.id === employee.id);
      if (idx === -1) {
        toast.error("Data pegawai tidak ditemukan di sistem.");
        return;
      }
      const region = [form.kecamatan, form.kabupaten, form.provinsi]
        .filter(Boolean)
        .join(" | ");
      const updated: EmployeeRecord = {
        ...employees[idx],
        fullName: form.fullName,
        nip: form.nip,
        position: form.position,
        gender: form.gender,
        birthDate: form.birthDate ? new Date(form.birthDate).getTime() : 0,
        birthPlace: form.birthPlace,
        region,
        kecamatan: form.kecamatan,
        kabupaten: form.kabupaten,
        provinsi: form.provinsi,
        phone: form.phone,
        email: form.email,
        updatedAt: Date.now(),
      };
      employees[idx] = updated;
      localStorage.setItem("ekinerja_employees", JSON.stringify(employees));
      setEmployee(updated);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Profil berhasil diperbarui!");
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLocalAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} />
              Profil Admin
            </DialogTitle>
          </DialogHeader>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-green-800">
              Login sebagai Admin Lokal
            </p>
            <p className="text-xs text-green-700">
              Token:{" "}
              <span className="font-mono font-bold">ekinerja-admin-2024</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Akun admin lokal tidak memiliki profil yang dapat diedit.
            </p>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="profile.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle size={18} />
            Edit Profil
          </DialogTitle>
        </DialogHeader>

        {!employee ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Data profil tidak ditemukan. Pastikan Anda sudah mendaftarkan data
            pegawai.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  data-ocid="profile.input"
                  placeholder="Nama lengkap"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  NIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nomor Induk Pegawai"
                  value={form.nip}
                  onChange={(e) => setField("nip", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Jabatan</Label>
                <Select
                  value={form.position}
                  onValueChange={(v) => setField("position", v)}
                >
                  <SelectTrigger>
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

              <div className="space-y-1">
                <Label className="text-xs font-medium">Jenis Kelamin</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setField("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tanggal Lahir</Label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setField("birthDate", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tempat Lahir</Label>
                <Input
                  placeholder="Kota/Kabupaten lahir"
                  value={form.birthPlace}
                  onChange={(e) => setField("birthPlace", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Kecamatan</Label>
                <Input
                  placeholder="Kecamatan"
                  value={form.kecamatan}
                  onChange={(e) => setField("kecamatan", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Kabupaten/Kota</Label>
                <Input
                  placeholder="Kabupaten/Kota"
                  value={form.kabupaten}
                  onChange={(e) => setField("kabupaten", e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Provinsi</Label>
                <Input
                  placeholder="Provinsi"
                  value={form.provinsi}
                  onChange={(e) => setField("provinsi", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">No. HP</Label>
                <Input
                  placeholder="08xx-xxxx-xxxx"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="profile.save_button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
              <Button
                data-ocid="profile.cancel_button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
