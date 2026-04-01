import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Employee, WorkTarget } from "../backend";
import { useAuth } from "../context/AuthContext";
import {
  useAllEmployees,
  useAllWorkTargets,
  useCreateWorkTarget,
  useDeleteWorkTarget,
  useUpdateWorkTarget,
} from "../hooks/useQueries";

const SATUAN = [
  "Orang",
  "Kegiatan",
  "Laporan",
  "Keluarga",
  "Kunjungan",
  "Kelompok",
];

const EMPTY_TARGET = {
  employeeId: 0n as bigint,
  period: "",
  activityType: "",
  indicator: "",
  unit: "",
  targetValue: 0,
};

export default function TargetKinerja() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const { data: allEmployees = [] } = useAllEmployees();

  const { data: allTargets = [], isLoading: loadAll } = useAllWorkTargets();

  const isLoading = loadAll;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<WorkTarget | null>(null);
  const [form, setForm] = useState(EMPTY_TARGET);

  const createTarget = useCreateWorkTarget();
  const updateTarget = useUpdateWorkTarget();
  const deleteTarget = useDeleteWorkTarget();

  const empMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toString(), e])),
    [allEmployees],
  );

  const visibleTargets = useMemo(() => {
    if (isAdmin) return allTargets;
    return allTargets;
  }, [allTargets, isAdmin]);

  const openCreate = () => {
    setEditingTarget(null);
    setForm(EMPTY_TARGET);
    setModalOpen(true);
  };

  const openEdit = (t: WorkTarget) => {
    setEditingTarget(t);
    setForm({
      employeeId: t.employeeId,
      period: t.period,
      activityType: t.activityType,
      indicator: t.indicator,
      unit: t.unit,
      targetValue: t.targetValue,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (
      !form.period ||
      !form.activityType ||
      !form.indicator ||
      !form.unit ||
      form.targetValue <= 0
    ) {
      toast.error("Lengkapi semua field target kinerja.");
      return;
    }
    if (isAdmin && !form.employeeId) {
      toast.error("Pilih pegawai terlebih dahulu.");
      return;
    }
    const targetData: WorkTarget = {
      id: editingTarget?.id ?? 0n,
      createdAt: editingTarget?.createdAt ?? 0n,
      employeeId: form.employeeId,
      period: form.period,
      activityType: form.activityType,
      indicator: form.indicator,
      unit: form.unit,
      targetValue: Number(form.targetValue),
    };
    try {
      if (editingTarget) {
        await updateTarget.mutateAsync({ id: editingTarget.id, t: targetData });
        toast.success("Target kinerja berhasil diperbarui.");
      } else {
        await createTarget.mutateAsync(targetData);
        toast.success("Target kinerja berhasil ditambahkan.");
      }
      setModalOpen(false);
    } catch {
      toast.error("Gagal menyimpan target kinerja.");
    }
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteTarget.mutateAsync(id);
      toast.success("Target berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus target.");
    }
  };

  const isSaving = createTarget.isPending || updateTarget.isPending;

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
    <div className="space-y-4" data-ocid="target.section">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {visibleTargets.length} target kinerja
        </p>
        <Button data-ocid="target.add.primary_button" onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Tambah Target
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {isAdmin && <TableHead>Pegawai</TableHead>}
              <TableHead>Periode</TableHead>
              <TableHead>Jenis Kegiatan</TableHead>
              <TableHead>Indikator</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTargets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="target.empty_state"
                >
                  Belum ada target kinerja
                </TableCell>
              </TableRow>
            ) : (
              visibleTargets.map((t, idx) => (
                <TableRow
                  key={t.id.toString()}
                  data-ocid={`target.item.${idx + 1}`}
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
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                    {t.indicator}
                  </TableCell>
                  <TableCell className="text-sm">{t.unit}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {t.targetValue}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        data-ocid={`target.edit_button.${idx + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(t)}
                      >
                        <Edit size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            data-ocid={`target.delete_button.${idx + 1}`}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-ocid="target.delete.dialog">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Target?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Target kinerja ini akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-ocid="target.delete.cancel_button">
                              Batal
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-ocid="target.delete.confirm_button"
                              onClick={() => handleDelete(t.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-ocid="target.form.modal">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Target Kinerja" : "Tambah Target Kinerja"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label>
                  Pegawai <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.employeeId.toString()}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, employeeId: BigInt(v) }))
                  }
                >
                  <SelectTrigger data-ocid="target.employee.select">
                    <SelectValue placeholder="Pilih pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEmployees.map((e) => (
                      <SelectItem key={e.id.toString()} value={e.id.toString()}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                Periode <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="target.period.input"
                placeholder="YYYY-MM (cth: 2025-01)"
                value={form.period}
                onChange={(e) =>
                  setForm((f) => ({ ...f, period: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Jenis Kegiatan <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="target.activityType.input"
                placeholder="Tulis jenis kegiatan..."
                value={form.activityType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activityType: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Indikator Capaian <span className="text-destructive">*</span>
              </Label>
              <Input
                data-ocid="target.indicator.input"
                placeholder="Misal: Jumlah akseptor baru yang dilayani"
                value={form.indicator}
                onChange={(e) =>
                  setForm((f) => ({ ...f, indicator: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Satuan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                >
                  <SelectTrigger data-ocid="target.unit.select">
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {SATUAN.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nilai Target <span className="text-destructive">*</span>
                </Label>
                <Input
                  data-ocid="target.value.input"
                  type="number"
                  min={1}
                  value={form.targetValue || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      targetValue: Number(e.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="target.form.cancel_button"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-ocid="target.form.submit_button"
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
