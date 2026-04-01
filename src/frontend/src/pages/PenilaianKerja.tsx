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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { WorkRating } from "../backend";
import type { WorkRealization, WorkTarget } from "../backend";
import { useAuth } from "../context/AuthContext";
import {
  useAllEmployees,
  useAllWorkRealizations,
  useAllWorkTargets,
  useCreateWorkRealization,
  useUpdateWorkRealization,
} from "../hooks/useQueries";

function calcRating(pct: number): WorkRating {
  if (pct >= 80) return WorkRating.baik;
  if (pct >= 60) return WorkRating.cukup;
  return WorkRating.kurang;
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

export default function PenilaianKerja() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const { data: allTargets = [], isLoading: loadT } = useAllWorkTargets();
  const { data: allRealizations = [], isLoading: loadR } =
    useAllWorkRealizations();
  const { data: allEmployees = [] } = useAllEmployees();

  const createReal = useCreateWorkRealization();
  const updateReal = useUpdateWorkRealization();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<WorkTarget | null>(null);
  const [existingReal, setExistingReal] = useState<WorkRealization | null>(
    null,
  );
  const [realizedValue, setRealizedValue] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");

  const isLoading = loadT || loadR;

  const empMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toString(), e])),
    [allEmployees],
  );
  const realMap = useMemo(() => {
    const m = new Map<string, WorkRealization>();
    for (const r of allRealizations) m.set(r.targetId.toString(), r);
    return m;
  }, [allRealizations]);

  const openModal = (target: WorkTarget) => {
    setSelectedTarget(target);
    const existing = realMap.get(target.id.toString()) ?? null;
    setExistingReal(existing);
    setRealizedValue(existing ? String(existing.realizedValue) : "");
    setSupervisorNotes(existing?.supervisorNotes ?? "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTarget || !realizedValue) {
      toast.error("Masukkan nilai realisasi.");
      return;
    }
    const rv = Number(realizedValue);
    try {
      if (existingReal) {
        await updateReal.mutateAsync({
          id: existingReal.id,
          realizedValue: rv,
          supervisorNotes,
        });
        toast.success("Realisasi berhasil diperbarui.");
      } else {
        await createReal.mutateAsync({
          targetId: selectedTarget.id,
          employeeId: selectedTarget.employeeId,
          realizedValue: rv,
          supervisorNotes,
        });
        toast.success("Realisasi berhasil disimpan.");
      }
      setModalOpen(false);
    } catch {
      toast.error("Gagal menyimpan realisasi.");
    }
  };

  const isSaving = createReal.isPending || updateReal.isPending;

  // Preview achievement
  const previewPct =
    selectedTarget && realizedValue
      ? Math.round((Number(realizedValue) / selectedTarget.targetValue) * 100)
      : null;
  const previewRating = previewPct !== null ? calcRating(previewPct) : null;

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
    <div className="space-y-4" data-ocid="penilaian.section">
      <p className="text-sm text-muted-foreground">
        {allTargets.length} target terdaftar
      </p>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {isAdmin && <TableHead>Pegawai</TableHead>}
              <TableHead>Periode</TableHead>
              <TableHead>Kegiatan</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Realisasi</TableHead>
              <TableHead className="text-right">Capaian</TableHead>
              <TableHead>Penilaian</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTargets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 9 : 8}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="penilaian.empty_state"
                >
                  Belum ada data target kinerja
                </TableCell>
              </TableRow>
            ) : (
              allTargets.map((t, idx) => {
                const real = realMap.get(t.id.toString());
                return (
                  <TableRow
                    key={t.id.toString()}
                    data-ocid={`penilaian.item.${idx + 1}`}
                  >
                    {isAdmin && (
                      <TableCell className="text-sm font-medium">
                        {empMap.get(t.employeeId.toString())?.fullName ??
                          `ID: ${t.employeeId}`}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-mono">
                      {t.period}
                    </TableCell>
                    <TableCell className="text-sm">{t.activityType}</TableCell>
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
                      {real ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span
                            className={`text-sm font-semibold ${
                              real.achievementPercent >= 80
                                ? "text-green-600"
                                : real.achievementPercent >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {real.achievementPercent}%
                          </span>
                          <Progress
                            value={Math.min(real.achievementPercent, 100)}
                            className="w-16 h-1.5"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {real ? (
                        <RatingBadge rating={real.rating as WorkRating} />
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Belum dinilai
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-36 truncate text-xs text-muted-foreground">
                      {real?.supervisorNotes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        data-ocid={`penilaian.input.button.${idx + 1}`}
                        size="sm"
                        variant={real ? "outline" : "default"}
                        onClick={() => openModal(t)}
                      >
                        {real ? "Edit" : "Input Realisasi"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Realisasi Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md" data-ocid="penilaian.form.modal">
          <DialogHeader>
            <DialogTitle>
              {existingReal
                ? "Edit Realisasi Kinerja"
                : "Input Realisasi Kinerja"}
            </DialogTitle>
          </DialogHeader>
          {selectedTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedTarget.activityType}</p>
                <p className="text-muted-foreground mt-1">
                  Target: {selectedTarget.targetValue} {selectedTarget.unit} |
                  Periode: {selectedTarget.period}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nilai Realisasi ({selectedTarget.unit}){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  data-ocid="penilaian.realisasi.input"
                  type="number"
                  min={0}
                  value={realizedValue}
                  onChange={(e) => setRealizedValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              {previewPct !== null && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Capaian Otomatis:
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        previewPct >= 80
                          ? "text-green-600"
                          : previewPct >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {previewPct}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(previewPct, 100)}
                    className="h-2 mb-2"
                  />
                  {previewRating && <RatingBadge rating={previewRating} />}
                </div>
              )}
              {isAdmin && (
                <div className="space-y-1.5">
                  <Label>Catatan Evaluasi (Atasan)</Label>
                  <Textarea
                    data-ocid="penilaian.notes.textarea"
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder="Catatan evaluasi dari atasan..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="penilaian.form.cancel_button"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-ocid="penilaian.form.submit_button"
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
