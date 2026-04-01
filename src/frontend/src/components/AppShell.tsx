import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardList,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export type Page =
  | "dashboard"
  | "pegawai"
  | "target"
  | "penilaian"
  | "rekapitulasi"
  | "laporan"
  | "persetujuan"
  | "audit";

interface NavItem {
  id: Page;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
  penyuluhHidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  {
    id: "pegawai",
    label: "Data Pegawai",
    icon: <Users size={18} />,
    adminOnly: true,
  },
  {
    id: "persetujuan",
    label: "Persetujuan",
    icon: <ShieldCheck size={18} />,
    adminOnly: true,
  },
  { id: "target", label: "Target Kinerja", icon: <Target size={18} /> },
  {
    id: "penilaian",
    label: "Penilaian Kinerja",
    icon: <ClipboardList size={18} />,
  },
  { id: "rekapitulasi", label: "Rekapitulasi", icon: <BarChart3 size={18} /> },
  { id: "laporan", label: "Download Laporan", icon: <Download size={18} /> },
  {
    id: "audit",
    label: "Audit Log",
    icon: <ScrollText size={18} />,
    adminOnly: true,
  },
];

const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard Utama",
  pegawai: "Manajemen Pegawai",
  target: "Target Kinerja",
  penilaian: "Penilaian Hasil Kerja",
  rekapitulasi: "Rekapitulasi Kinerja",
  laporan: "Download Laporan",
  persetujuan: "Persetujuan Pegawai",
  audit: "Audit Log Aktivitas",
};

interface AppShellProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
  notifCount?: number;
}

export function AppShell({
  currentPage,
  onNavigate,
  children,
  notifCount = 0,
}: AppShellProps) {
  const { clear, identity } = useInternetIdentity();
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const principalStr = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = `${principalStr.slice(0, 5)}...${principalStr.slice(-3)}`;

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              e-Kinerja
            </p>
            <p className="text-white/70 text-xs">Penyuluh KB</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              data-ocid={`nav.${item.id}.link`}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-primary text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0",
                  isActive ? "text-white" : "text-white/60",
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight size={14} className="opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-white/5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-white text-xs">
              {role === "admin" ? "AD" : "PY"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {shortPrincipal}
            </p>
            <Badge
              variant="outline"
              className="text-white/70 border-white/30 text-[10px] px-1 py-0"
            >
              {role === "admin" ? "Admin" : "Penyuluh"}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          data-ocid="nav.logout.button"
          onClick={clear}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar z-50 lg:hidden"
            >
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <h1 className="font-bold text-foreground text-base lg:text-lg">
              {PAGE_TITLES[currentPage]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-ocid="topbar.notification.button"
              >
                <Bell size={18} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Button>
            </div>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {role === "admin" ? "AD" : "PY"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
