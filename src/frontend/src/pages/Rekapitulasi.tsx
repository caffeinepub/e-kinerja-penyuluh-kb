import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WorkRating } from "../backend";
import {
  useAllEmployees,
  useAllWorkRealizations,
  useAllWorkTargets,
} from "../hooks/useQueries";

const WILAYAH_OPTIONS = [
  "all",
  "Kecamatan Medan Kota",
  "Kecamatan Medan Baru",
  "Kecamatan Medan Timur",
  "Kecamatan Medan Barat",
  "Kecamatan Medan Selatan",
  "Kecamatan Medan Utara",
  "Kecamatan Medan Tembung",
  "Kecamatan Medan Amplas",
];

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

export default function Rekapitulasi() {
  const { data: employees = [], isLoading: loadE } = useAllEmployees();
  const { data: targets = [], isLoading: loadT } = useAllWorkTargets();
  const { data: realizations = [], isLoading: loadR } =
    useAllWorkRealizations();

  const [filterWilayah, setFilterWilayah] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const isLoading = loadE || loadT || loadR;

  // Get unique periods
  const periods = useMemo(() => {
    const set = new Set(targets.map((t) => t.period));
    return ["all", ...Array.from(set).sort().reverse()];
  }, [targets]);

  const stats = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.id.toString(), e]));
    const realMap = new Map(
      realizations.map((r) => [r.targetId.toString(), r]),
    );

    // Filter targets
    const filteredTargets = targets.filter((t) => {
      const emp = empMap.get(t.employeeId.toString());
      const matchWilayah =
        filterWilayah === "all" || emp?.region === filterWilayah;
      const matchPeriod = filterPeriod === "all" || t.period === filterPeriod;
      return matchWilayah && matchPeriod;
    });

    // Build per-employee stats
    const empStats = new Map<
      string,
      {
        totalTargets: number;
        totalRealized: number;
        achievements: number[];
        ratings: WorkRating[];
      }
    >();
    for (const t of filteredTargets) {
      const key = t.employeeId.toString();
      if (!empStats.has(key))
        empStats.set(key, {
          totalTargets: 0,
          totalRealized: 0,
          achievements: [],
          ratings: [],
        });
      const s = empStats.get(key)!;
      s.totalTargets++;
      const r = realMap.get(t.id.toString());
      if (r) {
        s.totalRealized++;
        s.achievements.push(r.achievementPercent);
        s.ratings.push(r.rating as WorkRating);
      }
    }

    const ranking = Array.from(empStats.entries())
      .map(([empId, s]) => {
        const emp = empMap.get(empId);
        const avg =
          s.achievements.length > 0
            ? Math.round(
                s.achievements.reduce((a, b) => a + b, 0) /
                  s.achievements.length,
              )
            : 0;
        const ratingCounts: Record<string, number> = {};
        for (const r of s.ratings) ratingCounts[r] = (ratingCounts[r] ?? 0) + 1;
        const dominantRating = Object.entries(ratingCounts).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] as WorkRating | undefined;
        return {
          empId,
          emp,
          avg,
          totalTargets: s.totalTargets,
          totalRealized: s.totalRealized,
          dominantRating,
        };
      })
      .sort((a, b) => b.avg - a.avg)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    const barData = ranking.slice(0, 10).map((r) => ({
      name:
        r.emp?.fullName?.split(" ").slice(0, 2).join(" ") ??
        r.empId.slice(0, 6),
      capaian: r.avg,
    }));

    // Line chart: avg capaian per period (all employees)
    const periodStats = new Map<string, number[]>();
    for (const r of realizations) {
      const t = targets.find((tgt) => tgt.id === r.targetId);
      if (!t) continue;
      if (!periodStats.has(t.period)) periodStats.set(t.period, []);
      periodStats.get(t.period)!.push(r.achievementPercent);
    }
    const lineData = Array.from(periodStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({
        period,
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }));

    const overallAvg =
      ranking.length > 0
        ? Math.round(ranking.reduce((s, r) => s + r.avg, 0) / ranking.length)
        : 0;

    return { ranking, barData, lineData, overallAvg };
  }, [employees, targets, realizations, filterWilayah, filterPeriod]);

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
    <div className="space-y-5" data-ocid="rekapitulasi.section">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger
            data-ocid="rekapitulasi.period.select"
            className="w-44"
          >
            <SelectValue placeholder="Semua Periode" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "all" ? "Semua Periode" : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterWilayah} onValueChange={setFilterWilayah}>
          <SelectTrigger
            data-ocid="rekapitulasi.wilayah.select"
            className="w-52"
          >
            <SelectValue placeholder="Semua Wilayah" />
          </SelectTrigger>
          <SelectContent>
            {WILAYAH_OPTIONS.map((w) => (
              <SelectItem key={w} value={w}>
                {w === "all" ? "Semua Wilayah" : w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rata-rata Capaian</p>
            <p className="text-2xl font-bold mt-1">{stats.overallAvg}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Penyuluh</p>
            <p className="text-2xl font-bold mt-1">{stats.ranking.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Target Selesai</p>
            <p className="text-2xl font-bold mt-1">
              {stats.ranking.reduce((s, r) => s + r.totalRealized, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Capaian Pegawai</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.barData.length === 0 ? (
              <div
                className="h-52 flex items-center justify-center text-muted-foreground text-sm"
                data-ocid="rekapitulasi.bar.empty_state"
              >
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
                  <Bar
                    dataKey="capaian"
                    name="Capaian %"
                    fill="#2563EB"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Tren Capaian per Periode
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lineData.length < 2 ? (
              <div
                className="h-52 flex items-center justify-center text-muted-foreground text-sm"
                data-ocid="rekapitulasi.line.empty_state"
              >
                Perlu minimal 2 periode untuk tren
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={stats.lineData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
                  <Tooltip formatter={(v: number) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="Avg Capaian %"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking Pegawai</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead className="text-right">Total Target</TableHead>
                <TableHead className="text-right">Selesai</TableHead>
                <TableHead className="text-right">Avg Capaian</TableHead>
                <TableHead>Rating Dominan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.ranking.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                    data-ocid="rekapitulasi.empty_state"
                  >
                    Belum ada data rekapitulasi
                  </TableCell>
                </TableRow>
              ) : (
                stats.ranking.map((r, idx) => (
                  <TableRow
                    key={r.empId}
                    data-ocid={`rekapitulasi.item.${idx + 1}`}
                  >
                    <TableCell>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                          r.rank === 1
                            ? "bg-amber-100 text-amber-700"
                            : r.rank === 2
                              ? "bg-gray-100 text-gray-700"
                              : r.rank === 3
                                ? "bg-orange-100 text-orange-700"
                                : "text-muted-foreground"
                        }`}
                      >
                        {r.rank}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {r.emp?.fullName ?? r.empId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.emp?.region ?? "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.totalTargets}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.totalRealized}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold text-sm ${
                          r.avg >= 80
                            ? "text-green-600"
                            : r.avg >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {r.avg}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.dominantRating ? (
                        <RatingBadge rating={r.dominantRating} />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
