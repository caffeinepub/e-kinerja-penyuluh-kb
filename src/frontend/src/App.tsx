import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { WorkRating } from "./backend.d";
import { AppShell, type Page } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAllWorkRealizations } from "./hooks/useQueries";
import AuditLog from "./pages/AuditLog";
import Dashboard from "./pages/Dashboard";
import DownloadLaporan from "./pages/DownloadLaporan";
import LoginPage from "./pages/LoginPage";
import ManajemenPegawai from "./pages/ManajemenPegawai";
import PenilaianKerja from "./pages/PenilaianKerja";
import PersetujuanPegawai from "./pages/PersetujuanPegawai";
import Rekapitulasi from "./pages/Rekapitulasi";
import TargetKinerja from "./pages/TargetKinerja";

function AppRouter() {
  const { isLoggedIn, isApproved, isLoadingAuth, role } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const { data: realizations = [] } = useAllWorkRealizations();

  const lowPerfCount = realizations.filter(
    (r) => r.achievementPercent < 60,
  ).length;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage mode="login" />;
  }

  if (!isApproved) {
    return <LoginPage mode="waiting" />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "pegawai":
        return role === "admin" ? <ManajemenPegawai /> : <Dashboard />;
      case "target":
        return <TargetKinerja />;
      case "penilaian":
        return <PenilaianKerja />;
      case "rekapitulasi":
        return <Rekapitulasi />;
      case "laporan":
        return <DownloadLaporan />;
      case "persetujuan":
        return role === "admin" ? <PersetujuanPegawai /> : <Dashboard />;
      case "audit":
        return role === "admin" ? <AuditLog /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      notifCount={lowPerfCount}
    >
      {renderPage()}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
