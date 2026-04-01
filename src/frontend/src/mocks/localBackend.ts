import type { Principal } from "@icp-sdk/core/principal";
import {
  type ApprovalStatus,
  type AuditLog,
  type Employee,
  type EmployeeId,
  type UserApprovalInfo,
  UserRole,
  WorkRating,
  type WorkRealization,
  type WorkRealizationId,
  type WorkTarget,
  type WorkTargetId,
  type backendInterface,
} from "../backend";

function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(): bigint {
  return BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 10000));
}

// Serialized employee (bigints as numbers)
type StoredEmployee = Omit<
  Employee,
  "id" | "birthDate" | "createdAt" | "updatedAt" | "photo"
> & {
  id: number;
  birthDate: number;
  createdAt: number;
  updatedAt: number;
};

type StoredWorkTarget = Omit<WorkTarget, "id" | "employeeId" | "createdAt"> & {
  id: number;
  employeeId: number;
  createdAt: number;
};

type StoredWorkRealization = Omit<
  WorkRealization,
  "id" | "employeeId" | "targetId" | "evaluatedAt"
> & {
  id: number;
  employeeId: number;
  targetId: number;
  evaluatedAt: number;
};

// Pending approval with employee form data
export interface PendingApprovalEmployeeData {
  nip: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  position: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  phone: string;
  email: string;
}

type StoredPendingApproval = {
  principal: string;
  status: string;
  requestedAt: number;
  employeeData?: PendingApprovalEmployeeData;
};

function toEmployee(s: StoredEmployee): Employee {
  return {
    ...s,
    id: BigInt(s.id),
    birthDate: BigInt(s.birthDate),
    createdAt: BigInt(s.createdAt),
    updatedAt: BigInt(s.updatedAt),
    photo: undefined,
  } as Employee;
}

function fromEmployee(e: Employee): StoredEmployee {
  return {
    nip: e.nip,
    region: e.region,
    status: e.status,
    role: e.role,
    fullName: e.fullName,
    birthPlace: e.birthPlace,
    email: e.email,
    gender: e.gender,
    phone: e.phone,
    position: e.position,
    id: Number(e.id),
    birthDate: Number(e.birthDate),
    createdAt: Number(e.createdAt),
    updatedAt: Number(e.updatedAt),
  };
}

function toWorkTarget(s: StoredWorkTarget): WorkTarget {
  return {
    ...s,
    id: BigInt(s.id),
    employeeId: BigInt(s.employeeId),
    createdAt: BigInt(s.createdAt),
  };
}

function fromWorkTarget(t: WorkTarget): StoredWorkTarget {
  return {
    activityType: t.activityType,
    period: t.period,
    unit: t.unit,
    indicator: t.indicator,
    targetValue: t.targetValue,
    id: Number(t.id),
    employeeId: Number(t.employeeId),
    createdAt: Number(t.createdAt),
  };
}

function toWorkRealization(s: StoredWorkRealization): WorkRealization {
  return {
    ...s,
    id: BigInt(s.id),
    employeeId: BigInt(s.employeeId),
    targetId: BigInt(s.targetId),
    evaluatedAt: BigInt(s.evaluatedAt),
  };
}

export function createLocalBackend(): backendInterface {
  return {
    isCallerAdmin: async () => true,
    isCallerApproved: async () => true,
    isAdmin: async () => true,
    getCallerUserRole: async () => UserRole.admin,

    getAllEmployees: async () => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      return stored.map(toEmployee);
    },

    createEmployee: async (employee: Employee) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      const newId = nextId();
      const now = Date.now();
      const newEmp: StoredEmployee = {
        ...fromEmployee(employee),
        id: Number(newId),
        createdAt: now,
        updatedAt: now,
      };
      stored.push(newEmp);
      setStore("ekinerja_employees", stored);
      return newId;
    },

    updateEmployee: async (id: EmployeeId, employee: Employee) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      const idx = stored.findIndex((e) => e.id === Number(id));
      if (idx !== -1) {
        stored[idx] = {
          ...fromEmployee(employee),
          id: Number(id),
          updatedAt: Date.now(),
          createdAt: stored[idx].createdAt,
        };
        setStore("ekinerja_employees", stored);
      }
    },

    deleteEmployee: async (id: EmployeeId) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      setStore(
        "ekinerja_employees",
        stored.filter((e) => e.id !== Number(id)),
      );
    },

    getEmployee: async (id: EmployeeId) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      const found = stored.find((e) => e.id === Number(id));
      if (!found) throw new Error("Employee not found");
      return toEmployee(found);
    },

    getEmployeesByPosition: async (position: string) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      return stored.filter((e) => e.position === position).map(toEmployee);
    },

    getEmployeesByRegion: async (region: string) => {
      const stored = getStore<StoredEmployee>("ekinerja_employees");
      return stored.filter((e) => e.region === region).map(toEmployee);
    },

    getAllWorkTargets: async () => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      return stored.map(toWorkTarget);
    },

    createWorkTarget: async (t: WorkTarget) => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      const newId = nextId();
      const newT: StoredWorkTarget = {
        ...fromWorkTarget(t),
        id: Number(newId),
        createdAt: Date.now(),
      };
      stored.push(newT);
      setStore("ekinerja_targets", stored);
      return newId;
    },

    updateWorkTarget: async (id: WorkTargetId, t: WorkTarget) => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      const idx = stored.findIndex((item) => item.id === Number(id));
      if (idx !== -1) {
        stored[idx] = {
          ...fromWorkTarget(t),
          id: Number(id),
          createdAt: stored[idx].createdAt,
        };
        setStore("ekinerja_targets", stored);
      }
    },

    deleteWorkTarget: async (id: WorkTargetId) => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      setStore(
        "ekinerja_targets",
        stored.filter((t) => t.id !== Number(id)),
      );
    },

    getWorkTargetsByEmployeeId: async (empId: EmployeeId) => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      return stored
        .filter((t) => t.employeeId === Number(empId))
        .map(toWorkTarget);
    },

    getWorkTargetsByPeriod: async (period: string) => {
      const stored = getStore<StoredWorkTarget>("ekinerja_targets");
      return stored.filter((t) => t.period === period).map(toWorkTarget);
    },

    getAllWorkRealizations: async () => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      return stored.map(toWorkRealization);
    },

    createWorkRealization: async (
      targetId: WorkTargetId,
      employeeId: EmployeeId,
      realizedValue: number,
      supervisorNotes: string,
    ) => {
      const targets = getStore<StoredWorkTarget>("ekinerja_targets");
      const target = targets.find((t) => t.id === Number(targetId));
      const targetValue = target?.targetValue || 100;
      const achievementPercent = (realizedValue / targetValue) * 100;
      let rating: WorkRating;
      if (achievementPercent >= 80) rating = WorkRating.baik;
      else if (achievementPercent >= 60) rating = WorkRating.cukup;
      else rating = WorkRating.kurang;

      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      const newId = nextId();
      stored.push({
        id: Number(newId),
        targetId: Number(targetId),
        employeeId: Number(employeeId),
        realizedValue,
        supervisorNotes,
        achievementPercent,
        rating,
        evaluatedAt: Date.now(),
      });
      setStore("ekinerja_realizations", stored);
      return newId;
    },

    updateWorkRealization: async (
      id: WorkRealizationId,
      realizedValue: number,
      supervisorNotes: string,
    ) => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      const idx = stored.findIndex((r) => r.id === Number(id));
      if (idx !== -1) {
        const targets = getStore<StoredWorkTarget>("ekinerja_targets");
        const target = targets.find((t) => t.id === stored[idx].targetId);
        const targetValue = target?.targetValue || 100;
        const achievementPercent = (realizedValue / targetValue) * 100;
        let rating: WorkRating;
        if (achievementPercent >= 80) rating = WorkRating.baik;
        else if (achievementPercent >= 60) rating = WorkRating.cukup;
        else rating = WorkRating.kurang;
        stored[idx] = {
          ...stored[idx],
          realizedValue,
          supervisorNotes,
          achievementPercent,
          rating,
          evaluatedAt: Date.now(),
        };
        setStore("ekinerja_realizations", stored);
      }
    },

    deleteWorkRealization: async (id: WorkRealizationId) => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      setStore(
        "ekinerja_realizations",
        stored.filter((r) => r.id !== Number(id)),
      );
    },

    getWorkRealizationsByEmployeeId: async (empId: EmployeeId) => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      return stored
        .filter((r) => r.employeeId === Number(empId))
        .map(toWorkRealization);
    },

    getWorkRealizationsByTargetId: async (targetId: WorkTargetId) => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      return stored
        .filter((r) => r.targetId === Number(targetId))
        .map(toWorkRealization);
    },

    getWorkRealizationsByRating: async (rating: WorkRating) => {
      const stored = getStore<StoredWorkRealization>("ekinerja_realizations");
      return stored.filter((r) => r.rating === rating).map(toWorkRealization);
    },

    getAllAuditLogs: async (): Promise<AuditLog[]> => [],
    getAuditLogsByUserId: async (_userId: Principal): Promise<AuditLog[]> => [],
    listApprovals: async (): Promise<UserApprovalInfo[]> => {
      const pending = getStore<StoredPendingApproval>(
        "ekinerja_pending_approvals",
      );
      return pending.map((p) => ({
        principal: {
          toString: () => p.principal,
          toText: () => p.principal,
        } as Principal,
        status: p.status as ApprovalStatus,
      }));
    },
    requestApproval: async () => {},
    setApproval: async (user: Principal, status: ApprovalStatus) => {
      const stored = getStore<StoredPendingApproval>(
        "ekinerja_pending_approvals",
      );
      const idx = stored.findIndex((p) => p.principal === user.toString());
      if (idx !== -1) {
        stored[idx].status = status;
        setStore("ekinerja_pending_approvals", stored);
      }
    },
    assignCallerUserRole: async (_user: Principal, _role: UserRole) => {},
    uploadEmployeePhoto: async (_id: EmployeeId, _photo: unknown) => {},

    // Internal method used by useActor – not in interface, safe to no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
