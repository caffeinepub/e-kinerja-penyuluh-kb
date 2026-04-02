import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_TOKEN, useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { PendingApprovalEmployeeData } from "../mocks/localBackend";

interface LoginPageProps {
  mode: "login" | "waiting";
}

const JABATAN_OPTIONS = [
  "Penyuluh KB Ahli Pertama",
  "Penyuluh KB Ahli Muda",
  "Penyuluh KB Ahli Madya",
  "Penyuluh KB Terampil",
  "PKB Koordinator",
  "Kepala Bidang",
];

const EMPTY_FORM: PendingApprovalEmployeeData = {
  nip: "",
  fullName: "",
  birthPlace: "",
  birthDate: "",
  gender: "male",
  position: "",
  kecamatan: "",
  kabupaten: "",
  provinsi: "",
  phone: "",
  email: "",
};

export default function LoginPage({ mode }: LoginPageProps) {
  const { login, isLoggingIn, clear, identity } = useInternetIdentity();
  const { refetchAuth, hasAdminToken } = useAuth();
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [empForm, setEmpForm] =
    useState<PendingApprovalEmployeeData>(EMPTY_FORM);

  const handleRegisterAndAccess = () => {
    if (
      !empForm.nip ||
      !empForm.fullName ||
      !empForm.kecamatan ||
      !empForm.position
    ) {
      toast.error(
        "Lengkapi field yang wajib diisi: NIP, Nama, Jabatan, Kecamatan.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const principal = identity?.getPrincipal().toString() ?? "unknown";
      const region = [empForm.kecamatan, empForm.kabupaten, empForm.provinsi]
        .filter(Boolean)
        .join(" | ");

      // Save to pending approvals so admin can see it
      const pending: unknown[] = JSON.parse(
        localStorage.getItem("ekinerja_pending_approvals") || "[]",
      );
      const pidx = (pending as Array<{ principal: string }>).findIndex(
        (p) => p.principal === principal,
      );
      const pentry = {
        principal,
        status: "approved",
        requestedAt: Date.now(),
        employeeData: empForm,
      };
      if (pidx !== -1) {
        (pending as Array<typeof pentry>)[pidx] = pentry;
      } else {
        (pending as Array<typeof pentry>).push(pentry);
      }
      localStorage.setItem(
        "ekinerja_pending_approvals",
        JSON.stringify(pending),
      );

      // Auto-create employee record so admin sees it in Manajemen Pegawai
      const employees: unknown[] = JSON.parse(
        localStorage.getItem("ekinerja_employees") || "[]",
      );
      const existingIdx = (employees as Array<{ nip: string }>).findIndex(
        (e) => e.nip === empForm.nip,
      );
      let empId: number;
      if (existingIdx === -1) {
        empId = Date.now();
        const newEmp = {
          id: empId,
          nip: empForm.nip,
          fullName: empForm.fullName,
          birthPlace: empForm.birthPlace,
          birthDate: empForm.birthDate
            ? new Date(empForm.birthDate).getTime()
            : 0,
          gender: empForm.gender,
          position: empForm.position,
          region,
          phone: empForm.phone,
          email: empForm.email,
          role: "penyuluh",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        employees.push(newEmp);
        localStorage.setItem("ekinerja_employees", JSON.stringify(employees));
      } else {
        empId = (employees[existingIdx] as { id: number }).id;
      }

      // Save principal → employeeId mapping
      const principalMap: Record<string, number> = JSON.parse(
        localStorage.getItem("ekinerja_principal_employee") || "{}",
      );
      principalMap[principal] = empId;
      localStorage.setItem(
        "ekinerja_principal_employee",
        JSON.stringify(principalMap),
      );

      // Mark principal as auto-registered so useActor grants local backend
      const autoReg: string[] = JSON.parse(
        localStorage.getItem("ekinerja_auto_registered") || "[]",
      );
      if (!autoReg.includes(principal)) {
        autoReg.push(principal);
        localStorage.setItem(
          "ekinerja_auto_registered",
          JSON.stringify(autoReg),
        );
      }

      toast.success("Data berhasil disimpan. Selamat datang!");
      refetchAuth();
    } catch {
      toast.error("Terjadi kesalahan, coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (adminPassword === ADMIN_TOKEN) {
      localStorage.setItem("localAdminMode", "true");
      window.location.reload();
    } else {
      toast.error("Password salah. Periksa kembali password admin Anda.");
      setIsSubmitting(false);
    }
  };

  const setField = (
    field: keyof PendingApprovalEmployeeData,
    value: string,
  ) => {
    setEmpForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        {[200, 400, 600, 800, 1000, 1200].map((size) => (
          <div
            key={size}
            className="absolute border border-white rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 my-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-sidebar flex items-center justify-center shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-foreground mb-1">
          e-Kinerja Penyuluh KB
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "Sistem Manajemen Kinerja Penyuluh Keluarga Berencana"
            : "Lengkapi data diri Anda untuk mulai menggunakan sistem"}
        </p>

        {mode === "login" ? (
          <>
            {hasAdminToken ? (
              /* Admin password form */
              <>
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-5">
                  <KeyRound size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700">
                    Token admin terdeteksi. Masukkan password untuk akses penuh.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="admin-password"
                      className="text-sm font-medium"
                    >
                      Password Admin
                    </Label>
                    <Input
                      id="admin-password"
                      data-ocid="login.input"
                      type="password"
                      placeholder="Masukkan password admin"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <Button
                    data-ocid="login.primary_button"
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || !adminPassword}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} className="mr-2" />
                        Masuk sebagai Admin
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">
                      atau
                    </span>
                  </div>
                </div>

                <Button
                  data-ocid="login.secondary_button"
                  variant="outline"
                  className="w-full"
                  onClick={login}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Menghubungkan...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} className="mr-2" />
                      Masuk dengan Internet Identity
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Untuk Penyuluh KB — gunakan Internet Identity
                </p>
              </>
            ) : (
              /* Regular Internet Identity login */
              <>
                <Button
                  data-ocid="login.primary_button"
                  className="w-full"
                  size="lg"
                  onClick={login}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Menghubungkan...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} className="mr-2" /> Masuk dengan Internet
                      Identity
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Gunakan Internet Identity untuk autentikasi yang aman.
                </p>
              </>
            )}
          </>
        ) : (
          /* Waiting mode: Employee data form — now auto-approves on submit */
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
              <ClipboardList size={14} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">
                Lengkapi data pegawai berikut untuk langsung mengakses sistem.
                Field bertanda <span className="text-red-500">*</span> wajib
                diisi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama lengkap"
                  value={empForm.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  NIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nomor Induk Pegawai"
                  value={empForm.nip}
                  onChange={(e) => setField("nip", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Jabatan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={empForm.position}
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
                  value={empForm.gender}
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
                  value={empForm.birthDate}
                  onChange={(e) => setField("birthDate", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Tempat Lahir</Label>
                <Input
                  placeholder="Kota/Kabupaten lahir"
                  value={empForm.birthPlace}
                  onChange={(e) => setField("birthPlace", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Kecamatan <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Kecamatan"
                  value={empForm.kecamatan}
                  onChange={(e) => setField("kecamatan", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Kabupaten/Kota</Label>
                <Input
                  placeholder="Kabupaten/Kota"
                  value={empForm.kabupaten}
                  onChange={(e) => setField("kabupaten", e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Provinsi</Label>
                <Input
                  placeholder="Provinsi"
                  value={empForm.provinsi}
                  onChange={(e) => setField("provinsi", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">No. HP</Label>
                <Input
                  placeholder="08xx-xxxx-xxxx"
                  value={empForm.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={empForm.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
            </div>

            <Button
              data-ocid="approval.request.primary_button"
              className="w-full mt-2"
              onClick={handleRegisterAndAccess}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Data & Masuk ke Dashboard"
              )}
            </Button>
            <Button
              data-ocid="approval.logout.button"
              variant="outline"
              className="w-full"
              onClick={clear}
            >
              Keluar
            </Button>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <p className="absolute bottom-4 text-white/40 text-xs">
        © {new Date().getFullYear()} Badan Kependudukan dan Keluarga Berencana
        Nasional
      </p>
    </div>
  );
}
