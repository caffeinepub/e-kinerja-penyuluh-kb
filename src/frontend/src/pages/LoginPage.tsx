import { Button } from "@/components/ui/button";
import { KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRequestApproval } from "../hooks/useQueries";

interface LoginPageProps {
  mode: "login" | "waiting";
}

export default function LoginPage({ mode }: LoginPageProps) {
  const { login, isLoggingIn, clear } = useInternetIdentity();
  const { refetchAuth, hasAdminToken } = useAuth();
  const requestApproval = useRequestApproval();

  const handleRequestApproval = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success("Permintaan persetujuan telah dikirim ke admin.");
      refetchAuth();
    } catch {
      toast.error("Gagal mengirim permintaan persetujuan.");
    }
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
        className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
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
            : "Akun Anda sedang menunggu persetujuan admin"}
        </p>

        {mode === "login" ? (
          <>
            {hasAdminToken && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <KeyRound size={14} className="text-green-600 shrink-0" />
                <p className="text-xs text-green-700">
                  Token admin terdeteksi. Login untuk masuk sebagai Admin.
                </p>
              </div>
            )}
            <Button
              data-ocid="login.primary_button"
              className="w-full"
              size="lg"
              onClick={login}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />{" "}
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
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
              <p className="font-semibold mb-1">Menunggu Persetujuan</p>
              <p>
                Admin belum menyetujui akun Anda. Kirim permintaan persetujuan
                atau hubungi administrator sistem.
              </p>
            </div>
            <Button
              data-ocid="approval.request.primary_button"
              className="w-full mb-3"
              onClick={handleRequestApproval}
              disabled={requestApproval.isPending}
            >
              {requestApproval.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />{" "}
                  Mengirim...
                </>
              ) : (
                "Kirim Permintaan Persetujuan"
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
          </>
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
