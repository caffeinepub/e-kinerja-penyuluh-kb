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
import { FileText, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LAMPIRAN_KEY = (targetId: string) => `lampiran_${targetId}`;

interface LampiranData {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: number;
}

function getLampiran(targetId: string): LampiranData | null {
  try {
    const raw = localStorage.getItem(LAMPIRAN_KEY(targetId));
    return raw ? (JSON.parse(raw) as LampiranData) : null;
  } catch {
    return null;
  }
}

function saveLampiran(targetId: string, data: LampiranData) {
  localStorage.setItem(LAMPIRAN_KEY(targetId), JSON.stringify(data));
}

function removeLampiran(targetId: string) {
  localStorage.removeItem(LAMPIRAN_KEY(targetId));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  // Lampiran state
  const [pendingLampiran, setPendingLampiran] = useState<LampiranData | null>(
    null,
  );
  const [existingLampiran, setExistingLampiran] = useState<LampiranData | null>(
    null,
  );
  const [removeExisting, setRemoveExisting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [lampiranVersion, setLampiranVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Load lampiran
    const lmp = getLampiran(target.id.toString());
    setExistingLampiran(lmp);
    setPendingLampiran(null);
    setRemoveExisting(false);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ukuran file maksimal 5 MB.");
      e.target.value = "";
      return;
    }
    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPendingLampiran({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: Date.now(),
      });
      setRemoveExisting(false);
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      toast.error("Gagal membaca file.");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
      // Handle lampiran persistence
      const tid = selectedTarget.id.toString();
      if (pendingLampiran) {
        saveLampiran(tid, pendingLampiran);
      } else if (removeExisting) {
        removeLampiran(tid);
      }
      setLampiranVersion((v) => v + 1);
      setModalOpen(false);
    } catch {
      toast.error("Gagal menyimpan realisasi.");
    }
  };

  const handleDeleteLampiranFromTable = (targetId: string) => {
    removeLampiran(targetId);
    setLampiranVersion((v) => v + 1);
    toast.success("Lampiran dihapus.");
  };

  const isSaving = createReal.isPending || updateReal.isPending;

  // Preview achievement
  const previewPct =
    selectedTarget && realizedValue
      ? Math.round((Number(realizedValue) / selectedTarget.targetValue) * 100)
      : null;
  const previewRating = previewPct !== null ? calcRating(previewPct) : null;

  // Determine if there's any lampiran to display in modal
  // hasLampiran computed inline via activeLampiran
  const activeLampiran =
    pendingLampiran ?? (removeExisting ? null : existingLampiran);

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

      {/* lampiranVersion used to trigger re-render when lampiran changes */}
      <span data-lampiran-version={lampiranVersion} className="hidden" />

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
              <TableHead>Lampiran</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTargets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 10 : 9}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="penilaian.empty_state"
                >
                  Belum ada data target kinerja
                </TableCell>
              </TableRow>
            ) : (
              allTargets.map((t, idx) => {
                const real = realMap.get(t.id.toString());
                const lmp = getLampiran(t.id.toString());
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
                    <TableCell className="min-w-32">
                      {lmp ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={lmp.dataUrl}
                            download={lmp.name}
                            className="flex items-center gap-1 text-xs text-primary hover:underline max-w-24 truncate"
                            title={lmp.name}
                          >
                            <FileText size={12} className="shrink-0" />
                            <span className="truncate">{lmp.name}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteLampiranFromTable(t.id.toString())
                            }
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Hapus lampiran"
                            data-ocid={`penilaian.delete_button.${idx + 1}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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

              {/* Lampiran Section */}
              <div className="space-y-2">
                <Label>Lampiran</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {activeLampiran ? (
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    {pendingLampiran ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {pendingLampiran.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(pendingLampiran.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingLampiran(null)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : existingLampiran && !removeExisting ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={existingLampiran.dataUrl}
                            download={existingLampiran.name}
                            className="text-sm font-medium text-primary hover:underline truncate block"
                          >
                            {existingLampiran.name}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(existingLampiran.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemoveExisting(true)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isReadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      data-ocid="penilaian.upload_button"
                    >
                      <Paperclip size={14} className="mr-2" />
                      {isReadingFile ? "Membaca file..." : "Ganti Lampiran"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {removeExisting && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs">
                        <span className="text-amber-700">
                          Lampiran akan dihapus saat disimpan
                        </span>
                        <button
                          type="button"
                          onClick={() => setRemoveExisting(false)}
                          className="text-amber-700 hover:text-amber-900 font-medium underline"
                        >
                          Urungkan
                        </button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isReadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      data-ocid="penilaian.upload_button"
                    >
                      <Paperclip size={14} className="mr-2" />
                      {isReadingFile ? "Membaca file..." : "Pilih File"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, Excel, JPG, PNG — maks. 5 MB
                    </p>
                  </div>
                )}
              </div>

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
