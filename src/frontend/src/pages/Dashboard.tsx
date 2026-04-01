import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Target, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type Employee,
  WorkRating,
  type WorkRealization,
  type WorkTarget,
} from "../backend";
import {
  useAllEmployees,
  useAllWorkRealizations,
  useAllWorkTargets,
} from "../hooks/useQueries";

function KpiCard({
  title,
  value,
  icon,
  sub,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RatingBadge({ rating }: { rating: WorkRating }) {
  const map: Record<WorkRating, { label: string; className: string }> = {
    [WorkRating.baik]: {
      label: "Baik",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    [WorkRating.cukup]: {
      label: "Cukup",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    [WorkRating.kurang]: {
      label: "Kurang",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };
  const { label, className } = map[rating];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export default function Dashboard() {
  const { data: employees = [], isLoading: loadEmp } = useAllEmployees();
  const { data: targets = [], isLoading: loadTarget } = useAllWorkTargets();
  const { data: realizations = [], isLoading: loadReal } =
    useAllWorkRealizations();

  const isLoading = loadEmp || loadTarget || loadReal;

  const stats = useMemo(() => {
    const activeEmps = employees.filter((e) => e.status === "active");
    const totalEmp = activeEmps.length;

    // Current month targets
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentTargets = targets.filter((t) => t.period === currentPeriod);

    const realMap = new Map<string, WorkRealization>();
    for (const r of realizations) {
      realMap.set(r.targetId.toString(), r);
    }

    const achievedThisMonth = currentTargets.filter((t) => {
      const r = realMap.get(t.id.toString());
      return r && r.achievementPercent >= 100;
    }).length;

    const allWithReal = realizations;
    const avgCapaian =
      allWithReal.length > 0
        ? Math.round(
            allWithReal.reduce((s, r) => s + r.achievementPercent, 0) /
              allWithReal.length,
          )
        : 0;

    const lowPerfEmployeeIds = new Set(
      realizations
        .filter((r) => r.achievementPercent < 60)
        .map((r) => r.employeeId.toString()),
    );
    const lowPerfCount = lowPerfEmployeeIds.size;

    // Chart: top 10 employees by avg capaian
    const empRealizationsMap = new Map<string, number[]>();
    for (const r of realizations) {
      const key = r.employeeId.toString();
      if (!empRealizationsMap.has(key)) empRealizationsMap.set(key, []);
      empRealizationsMap.get(key)!.push(r.achievementPercent);
    }
    const empMap = new Map(employees.map((e) => [e.id.toString(), e]));

    const barData = Array.from(empRealizationsMap.entries())
      .map(([empId, vals]) => ({
        name:
          empMap.get(empId)?.fullName?.split(" ").slice(0, 2).join(" ") ??
          empId.slice(0, 6),
        capaian: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        target: 100,
      }))
      .sort((a, b) => b.capaian - a.capaian)
      .slice(0, 10);

    // Donut: rating distribution
    const ratingCount: Record<string, number> = {
      Baik: 0,
      Cukup: 0,
      Kurang: 0,
    };
    for (const r of realizations) {
      if (r.rating === WorkRating.baik) ratingCount.Baik++;
      else if (r.rating === WorkRating.cukup) ratingCount.Cukup++;
      else ratingCount.Kurang++;
    }
    const donutData = [
      { name: "Baik", value: ratingCount.Baik, color: "#22C55E" },
      { name: "Cukup", value: ratingCount.Cukup, color: "#F59E0B" },
      { name: "Kurang", value: ratingCount.Kurang, color: "#EF4444" },
    ].filter((d) => d.value > 0);

    // Notifications: employees with capaian < 60
    const notifications = realizations
      .filter((r) => r.achievementPercent < 60)
      .map((r) => ({ emp: empMap.get(r.employeeId.toString()), r }));

    // Recent 5 employees with capaian
    const recentEmps = employees.slice(-5).map((e) => {
      const empRealizations = realizations.filter((r) => r.employeeId === e.id);
      const avg =
        empRealizations.length > 0
          ? Math.round(
              empRealizations.reduce((s, r) => s + r.achievementPercent, 0) /
                empRealizations.length,
            )
          : null;
      const lastRating =
        empRealizations.length > 0 ? empRealizations.at(-1)?.rating : null;
      return { emp: e, avg, lastRating };
    });

    return {
      totalEmp,
      achievedThisMonth,
      avgCapaian,
      lowPerfCount,
      barData,
      donutData,
      notifications,
      recentEmps,
    };
  }, [employees, targets, realizations]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="dashboard.section">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Pegawai Aktif"
          value={stats.totalEmp}
          icon={<Users size={22} />}
          color="#2563EB"
          sub="Penyuluh KB terdaftar"
        />
        <KpiCard
          title="Target Tercapai"
          value={stats.achievedThisMonth}
          icon={<Target size={22} />}
          color="#22C55E"
          sub="Bulan ini"
        />
        <KpiCard
          title="Rata-rata Capaian"
          value={`${stats.avgCapaian}%`}
          icon={<TrendingUp size={22} />}
          color="#14B8A6"
          sub="Keseluruhan"
        />
        <KpiCard
          title="Target Belum Tercapai"
          value={stats.lowPerfCount}
          icon={<AlertTriangle size={22} />}
          color="#EF4444"
          sub="Capaian < 60%"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <Card className="lg:col-span-3 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Capaian Kinerja per Pegawai (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.barData.length === 0 ? (
              <div
                className="h-56 flex items-center justify-center text-muted-foreground text-sm"
                data-ocid="dashboard.chart.empty_state"
              >
                Belum ada data realisasi kinerja
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={stats.barData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
                  <Tooltip formatter={(v: number) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                  <Bar
                    dataKey="target"
                    name="Target"
                    fill="#E5E7EB"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="capaian"
                    name="Capaian"
                    fill="#2563EB"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Status Penilaian Pegawai
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.donutData.length === 0 ? (
              <div
                className="h-56 flex items-center justify-center text-muted-foreground text-sm"
                data-ocid="dashboard.donut.empty_state"
              >
                Belum ada data penilaian
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.donutData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Pegawai"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent employees table */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Pegawai Terbaru & Capaian
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentEmps.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground text-sm"
                data-ocid="dashboard.employees.empty_state"
              >
                Belum ada data pegawai
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nama</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead>Capaian</TableHead>
                    <TableHead>Penilaian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentEmps.map(({ emp, avg, lastRating }, idx) => (
                    <TableRow
                      key={emp.id.toString()}
                      data-ocid={`dashboard.employees.item.${idx + 1}`}
                    >
                      <TableCell className="font-medium text-sm">
                        {emp.fullName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.region}
                      </TableCell>
                      <TableCell className="text-sm">
                        {avg !== null ? (
                          <span
                            className={
                              avg >= 80
                                ? "text-green-600 font-semibold"
                                : avg >= 60
                                  ? "text-amber-600 font-semibold"
                                  : "text-red-600 font-semibold"
                            }
                          >
                            {avg}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lastRating ? (
                          <RatingBadge rating={lastRating as WorkRating} />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Notifikasi Target Kurang
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.notifications.length === 0 ? (
              <div
                className="py-8 text-center"
                data-ocid="dashboard.notifications.empty_state"
              >
                <p className="text-green-600 font-medium text-sm">
                  ✅ Semua target tercapai!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.notifications.slice(0, 6).map(({ emp, r }, _idx) => (
                  <div
                    key={r.targetId.toString()}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-red-900 truncate">
                        {emp?.fullName ?? "Pegawai"}
                      </p>
                      <p className="text-xs text-red-600">
                        {r.achievementPercent}% capaian
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-red-100 text-red-700 border-red-200 shrink-0"
                    >
                      Kurang
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
