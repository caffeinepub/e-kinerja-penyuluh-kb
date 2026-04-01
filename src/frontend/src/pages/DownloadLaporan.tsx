import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { WorkRating } from "../backend";
import type { Employee, WorkRealization, WorkTarget } from "../backend";
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

function ratingLabel(r: WorkRating): string {
  return r === WorkRating.baik
    ? "Baik"
    : r === WorkRating.cukup
      ? "Cukup"
      : "Kurang";
}

export default function DownloadLaporan() {
  const { data: employees = [], isLoading: loadE } = useAllEmployees();
  const { data: targets = [], isLoading: loadT } = useAllWorkTargets();
  const { data: realizations = [], isLoading: loadR } =
    useAllWorkRealizations();

  const [filterWilayah, setFilterWilayah] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");

  const isLoading = loadE || loadT || loadR;

  const periods = useMemo(() => {
    const set = new Set(targets.map((t) => t.period));
    return ["all", ...Array.from(set).sort().reverse()];
  }, [targets]);

  const empMap = useMemo(
    () => new Map(employees.map((e) => [e.id.toString(), e])),
    [employees],
  );
  const realMap = useMemo(() => {
    const m = new Map<string, WorkRealization>();
    for (const r of realizations) m.set(r.targetId.toString(), r);
    return m;
  }, [realizations]);

  const previewData = useMemo(() => {
    return targets
      .filter((t) => {
        const emp = empMap.get(t.employeeId.toString());
        const matchWilayah =
          filterWilayah === "all" || emp?.region === filterWilayah;
        const matchPeriod = filterPeriod === "all" || t.period === filterPeriod;
        const matchEmp =
          filterEmployee === "all" ||
          t.employeeId.toString() === filterEmployee;
        return matchWilayah && matchPeriod && matchEmp;
      })
      .map((t) => ({
        t,
        emp: empMap.get(t.employeeId.toString()),
        real: realMap.get(t.id.toString()),
      }));
  }, [targets, empMap, realMap, filterWilayah, filterPeriod, filterEmployee]);

  const downloadCSV = () => {
    const headers = [
      "Nama",
      "NIP",
      "Jabatan",
      "Wilayah",
      "Periode",
      "Jenis Kegiatan",
      "Indikator",
      "Satuan",
      "Target",
      "Realisasi",
      "Capaian (%)",
      "Penilaian",
      "Catatan",
    ];
    const rows = previewData.map(({ emp, t, real }) => [
      emp?.fullName ?? "-",
      emp?.nip ?? "-",
      emp?.position ?? "-",
      emp?.region ?? "-",
      t.period,
      t.activityType,
      t.indicator,
      t.unit,
      t.targetValue,
      real?.realizedValue ?? "-",
      real?.achievementPercent ?? "-",
      real ? ratingLabel(real.rating as WorkRating) : "-",
      real?.supervisorNotes ?? "-",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-ekinerja-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = previewData
      .map(
        ({ emp, t, real }) => `
      <tr>
        <td>${emp?.fullName ?? "-"}</td>
        <td>${emp?.nip ?? "-"}</td>
        <td>${emp?.region ?? "-"}</td>
        <td>${t.period}</td>
        <td>${t.activityType}</td>
        <td>${t.targetValue} ${t.unit}</td>
        <td>${real ? `${real.realizedValue} ${t.unit}` : "-"}</td>
        <td>${real?.achievementPercent ?? "-"}%</td>
        <td>${real ? ratingLabel(real.rating as WorkRating) : "-"}</td>
      </tr>
    `,
      )
      .join("");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Laporan e-Kinerja Penyuluh KB</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
          h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
          h2 { font-size: 12px; text-align: center; color: #666; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
          th { background: #1E4078; color: white; font-size: 10px; }
          tr:nth-child(even) { background: #f5f7fa; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>LAPORAN e-KINERJA PENYULUH KB</h1>
        <h2>Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</h2>
        <table>
          <thead>
            <tr>
              <th>Nama</th><th>NIP</th><th>Wilayah</th><th>Periode</th>
              <th>Kegiatan</th><th>Target</th><th>Realisasi</th><th>Capaian</th><th>Penilaian</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">&copy; ${new Date().getFullYear()} e-Kinerja Penyuluh KB &mdash; BKKBN</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

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
    <div className="space-y-5" data-ocid="laporan.section">
      {/* Filter Card */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger
                  data-ocid="laporan.period.select"
                  className="w-44"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "all" ? "Semua Periode" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wilayah</Label>
              <Select value={filterWilayah} onValueChange={setFilterWilayah}>
                <SelectTrigger
                  data-ocid="laporan.wilayah.select"
                  className="w-52"
                >
                  <SelectValue />
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
            <div className="space-y-1.5">
              <Label>Pegawai</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger
                  data-ocid="laporan.employee.select"
                  className="w-52"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pegawai</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id.toString()} value={e.id.toString()}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Buttons */}
      <div className="flex gap-3">
        <Button
          data-ocid="laporan.pdf.primary_button"
          onClick={downloadPDF}
          className="flex items-center gap-2"
        >
          <FileText size={16} />
          Download PDF
        </Button>
        <Button
          data-ocid="laporan.csv.secondary_button"
          variant="outline"
          onClick={downloadCSV}
          className="flex items-center gap-2"
        >
          <FileSpreadsheet size={16} />
          Download CSV (Excel)
        </Button>
        <Badge variant="secondary" className="self-center">
          {previewData.length} data
        </Badge>
      </div>

      {/* Preview Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preview Data Laporan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Realisasi</TableHead>
                  <TableHead className="text-right">Capaian</TableHead>
                  <TableHead>Penilaian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="laporan.empty_state"
                    >
                      Tidak ada data sesuai filter
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.map(({ emp, t, real }, idx) => (
                    <TableRow
                      key={t.id.toString()}
                      data-ocid={`laporan.item.${idx + 1}`}
                    >
                      <TableCell className="text-sm font-medium">
                        {emp?.fullName ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {emp?.nip ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {emp?.region ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {t.period}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.activityType}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {t.targetValue} {t.unit}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {real ? (
                          `${real.realizedValue} ${t.unit}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-semibold ${
                            !real
                              ? "text-muted-foreground"
                              : real.achievementPercent >= 80
                                ? "text-green-600"
                                : real.achievementPercent >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                          }`}
                        >
                          {real ? `${real.achievementPercent}%` : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {real ? (
                          <Badge
                            variant="outline"
                            className={
                              {
                                [WorkRating.baik]:
                                  "bg-green-100 text-green-700 border-green-200",
                                [WorkRating.cukup]:
                                  "bg-amber-100 text-amber-700 border-amber-200",
                                [WorkRating.kurang]:
                                  "bg-red-100 text-red-700 border-red-200",
                              }[real.rating as WorkRating]
                            }
                          >
                            {ratingLabel(real.rating as WorkRating)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
