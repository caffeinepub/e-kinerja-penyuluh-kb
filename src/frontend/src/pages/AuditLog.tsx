import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAllAuditLogs } from "../hooks/useQueries";

function formatTimestamp(nanoseconds: bigint): string {
  const ms = Number(nanoseconds) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLog() {
  const { data: logs = [], isLoading } = useAllAuditLogs();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search)
      return [...logs].sort((a, b) => Number(b.timestamp - a.timestamp));
    const q = search.toLowerCase();
    return logs
      .filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.userId.toString().includes(q),
      )
      .sort((a, b) => Number(b.timestamp - a.timestamp));
  }, [logs, search]);

  const actionColors: Record<string, string> = {
    CREATE: "bg-blue-100 text-blue-700 border-blue-200",
    UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
    DELETE: "bg-red-100 text-red-700 border-red-200",
    LOGIN: "bg-green-100 text-green-700 border-green-200",
    APPROVE: "bg-teal-100 text-teal-700 border-teal-200",
    REJECT: "bg-orange-100 text-orange-700 border-orange-200",
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="audit.section">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} log aktivitas
        </p>
        <div className="relative w-64">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-ocid="audit.search_input"
            className="pl-9"
            placeholder="Cari aksi, deskripsi, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Deskripsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="audit.empty_state"
                >
                  Tidak ada log aktivitas
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log, idx) => (
                <TableRow
                  key={log.id.toString()}
                  data-ocid={`audit.item.${idx + 1}`}
                >
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm font-mono max-w-32 truncate">
                    {log.userId.toString().slice(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        actionColors[log.action.toUpperCase()] ??
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
