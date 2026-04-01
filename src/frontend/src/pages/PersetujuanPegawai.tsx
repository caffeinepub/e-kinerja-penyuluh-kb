import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  ApprovalStatus,
  useListApprovals,
  useSetApproval,
} from "../hooks/useQueries";

function statusBadge(status: ApprovalStatus) {
  const map: Record<
    ApprovalStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    [ApprovalStatus.pending]: {
      label: "Menunggu",
      className: "bg-amber-100 text-amber-700 border-amber-200",
      icon: <Clock size={12} />,
    },
    [ApprovalStatus.approved]: {
      label: "Disetujui",
      className: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle size={12} />,
    },
    [ApprovalStatus.rejected]: {
      label: "Ditolak",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: <XCircle size={12} />,
    },
  };
  const { label, className, icon } = map[status];
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 w-fit ${className}`}
    >
      {icon}
      {label}
    </Badge>
  );
}

export default function PersetujuanPegawai() {
  const { data: approvals = [], isLoading } = useListApprovals();
  const setApproval = useSetApproval();

  const pending = approvals.filter((a) => a.status === ApprovalStatus.pending);
  const approved = approvals.filter(
    (a) => a.status === ApprovalStatus.approved,
  );
  const rejected = approvals.filter(
    (a) => a.status === ApprovalStatus.rejected,
  );

  const handleApprove = async (principal: any) => {
    try {
      await setApproval.mutateAsync({
        user: principal,
        status: ApprovalStatus.approved,
      });
      toast.success("Pengguna berhasil disetujui.");
    } catch {
      toast.error("Gagal menyetujui pengguna.");
    }
  };

  const handleReject = async (principal: any) => {
    try {
      await setApproval.mutateAsync({
        user: principal,
        status: ApprovalStatus.rejected,
      });
      toast.success("Pengguna ditolak.");
    } catch {
      toast.error("Gagal menolak pengguna.");
    }
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

  const ApprovalTable = ({
    items,
    showActions,
  }: { items: typeof approvals; showActions: boolean }) => (
    <div className="bg-card rounded-lg border border-border shadow-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Principal</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 3 : 2}
                className="text-center py-8 text-muted-foreground"
                data-ocid="persetujuan.empty_state"
              >
                Tidak ada data
              </TableCell>
            </TableRow>
          ) : (
            items.map((a, idx) => (
              <TableRow
                key={a.principal.toString()}
                data-ocid={`persetujuan.item.${idx + 1}`}
              >
                <TableCell className="font-mono text-sm">
                  {a.principal.toString()}
                </TableCell>
                <TableCell>{statusBadge(a.status)}</TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        data-ocid={`persetujuan.approve.button.${idx + 1}`}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(a.principal)}
                        disabled={setApproval.isPending}
                      >
                        {setApproval.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        <span className="ml-1">Setujui</span>
                      </Button>
                      <Button
                        data-ocid={`persetujuan.reject.button.${idx + 1}`}
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleReject(a.principal)}
                        disabled={setApproval.isPending}
                      >
                        <XCircle size={14} />
                        <span className="ml-1">Tolak</span>
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4" data-ocid="persetujuan.section">
      <div className="flex gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex-1">
          <p className="text-amber-700 font-semibold text-lg">
            {pending.length}
          </p>
          <p className="text-amber-600 text-sm">Menunggu Persetujuan</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
          <p className="text-green-700 font-semibold text-lg">
            {approved.length}
          </p>
          <p className="text-green-600 text-sm">Disetujui</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex-1">
          <p className="text-red-700 font-semibold text-lg">
            {rejected.length}
          </p>
          <p className="text-red-600 text-sm">Ditolak</p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger data-ocid="persetujuan.pending.tab" value="pending">
            Menunggu ({pending.length})
          </TabsTrigger>
          <TabsTrigger data-ocid="persetujuan.approved.tab" value="approved">
            Disetujui ({approved.length})
          </TabsTrigger>
          <TabsTrigger data-ocid="persetujuan.rejected.tab" value="rejected">
            Ditolak ({rejected.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <ApprovalTable items={pending} showActions />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ApprovalTable items={approved} showActions={false} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <ApprovalTable items={rejected} showActions={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
