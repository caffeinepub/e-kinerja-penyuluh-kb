import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Employee,
  EmployeeId,
  WorkRealization,
  WorkRealizationId,
  WorkTarget,
  WorkTargetId,
} from "../backend";
import { ApprovalStatus, WorkRating } from "../backend";
import { useActor } from "./useActor";

export { ApprovalStatus, WorkRating };

function useActorReady() {
  const { actor, isFetching } = useActor();
  return { actor, ready: !!actor && !isFetching };
}

// ── Employees ──────────────────────────────────────────────────────────────────
export function useAllEmployees() {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => actor!.getAllEmployees(),
    enabled: ready,
  });
}

export function useEmployee(id: EmployeeId | null) {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["employee", id?.toString()],
    queryFn: () => actor!.getEmployee(id!),
    enabled: ready && id != null,
  });
}

export function useCreateEmployee() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emp: Employee) => actor!.createEmployee(emp),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emp }: { id: EmployeeId; emp: Employee }) =>
      actor!.updateEmployee(id, emp),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EmployeeId) => actor!.deleteEmployee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

// ── Work Targets ───────────────────────────────────────────────────────────────
export function useAllWorkTargets() {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["workTargets"],
    queryFn: () => actor!.getAllWorkTargets(),
    enabled: ready,
  });
}

export function useWorkTargetsByEmployee(empId: EmployeeId | null) {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["workTargets", "employee", empId?.toString()],
    queryFn: () => actor!.getWorkTargetsByEmployeeId(empId!),
    enabled: ready && empId != null,
  });
}

export function useCreateWorkTarget() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: WorkTarget) => actor!.createWorkTarget(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workTargets"] }),
  });
}

export function useUpdateWorkTarget() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, t }: { id: WorkTargetId; t: WorkTarget }) =>
      actor!.updateWorkTarget(id, t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workTargets"] }),
  });
}

export function useDeleteWorkTarget() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: WorkTargetId) => actor!.deleteWorkTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workTargets"] }),
  });
}

// ── Work Realizations ─────────────────────────────────────────────────────────
export function useAllWorkRealizations() {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["workRealizations"],
    queryFn: () => actor!.getAllWorkRealizations(),
    enabled: ready,
  });
}

export function useWorkRealizationsByEmployee(empId: EmployeeId | null) {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["workRealizations", "employee", empId?.toString()],
    queryFn: () => actor!.getWorkRealizationsByEmployeeId(empId!),
    enabled: ready && empId != null,
  });
}

export function useCreateWorkRealization() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetId,
      employeeId,
      realizedValue,
      supervisorNotes,
    }: {
      targetId: WorkTargetId;
      employeeId: EmployeeId;
      realizedValue: number;
      supervisorNotes: string;
    }) =>
      actor!.createWorkRealization(
        targetId,
        employeeId,
        realizedValue,
        supervisorNotes,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workRealizations"] }),
  });
}

export function useUpdateWorkRealization() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      realizedValue,
      supervisorNotes,
    }: {
      id: WorkRealizationId;
      realizedValue: number;
      supervisorNotes: string;
    }) => actor!.updateWorkRealization(id, realizedValue, supervisorNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workRealizations"] }),
  });
}

export function useDeleteWorkRealization() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: WorkRealizationId) => actor!.deleteWorkRealization(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workRealizations"] }),
  });
}

// ── Approvals ─────────────────────────────────────────────────────────────────
export function useListApprovals() {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["approvals"],
    queryFn: () => actor!.listApprovals(),
    enabled: ready,
  });
}

export function useSetApproval() {
  const { actor } = useActorReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      user,
      status,
    }: { user: Principal; status: ApprovalStatus }) =>
      actor!.setApproval(user, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}

export function useRequestApproval() {
  const { actor } = useActorReady();
  return useMutation({
    mutationFn: () => actor!.requestApproval(),
  });
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
export function useAllAuditLogs() {
  const { actor, ready } = useActorReady();
  return useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => actor!.getAllAuditLogs(),
    enabled: ready,
  });
}
