import { U as UserRole, W as WorkRating } from "./index-BJZ5WoHL.js";
function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function nextId() {
  return BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 1e4));
}
function toEmployee(s) {
  return {
    ...s,
    id: BigInt(s.id),
    birthDate: BigInt(s.birthDate),
    createdAt: BigInt(s.createdAt),
    updatedAt: BigInt(s.updatedAt),
    photo: void 0
  };
}
function fromEmployee(e) {
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
    updatedAt: Number(e.updatedAt)
  };
}
function toWorkTarget(s) {
  return {
    ...s,
    id: BigInt(s.id),
    employeeId: BigInt(s.employeeId),
    createdAt: BigInt(s.createdAt)
  };
}
function fromWorkTarget(t) {
  return {
    activityType: t.activityType,
    period: t.period,
    unit: t.unit,
    indicator: t.indicator,
    targetValue: t.targetValue,
    id: Number(t.id),
    employeeId: Number(t.employeeId),
    createdAt: Number(t.createdAt)
  };
}
function toWorkRealization(s) {
  return {
    ...s,
    id: BigInt(s.id),
    employeeId: BigInt(s.employeeId),
    targetId: BigInt(s.targetId),
    evaluatedAt: BigInt(s.evaluatedAt)
  };
}
function createLocalBackend() {
  return {
    isCallerAdmin: async () => true,
    isCallerApproved: async () => true,
    isAdmin: async () => true,
    getCallerUserRole: async () => UserRole.admin,
    getAllEmployees: async () => {
      const stored = getStore("ekinerja_employees");
      return stored.map(toEmployee);
    },
    createEmployee: async (employee) => {
      const stored = getStore("ekinerja_employees");
      const newId = nextId();
      const now = Date.now();
      const newEmp = {
        ...fromEmployee(employee),
        id: Number(newId),
        createdAt: now,
        updatedAt: now
      };
      stored.push(newEmp);
      setStore("ekinerja_employees", stored);
      return newId;
    },
    updateEmployee: async (id, employee) => {
      const stored = getStore("ekinerja_employees");
      const idx = stored.findIndex((e) => e.id === Number(id));
      if (idx !== -1) {
        stored[idx] = {
          ...fromEmployee(employee),
          id: Number(id),
          updatedAt: Date.now(),
          createdAt: stored[idx].createdAt
        };
        setStore("ekinerja_employees", stored);
      }
    },
    deleteEmployee: async (id) => {
      const stored = getStore("ekinerja_employees");
      setStore(
        "ekinerja_employees",
        stored.filter((e) => e.id !== Number(id))
      );
    },
    getEmployee: async (id) => {
      const stored = getStore("ekinerja_employees");
      const found = stored.find((e) => e.id === Number(id));
      if (!found) throw new Error("Employee not found");
      return toEmployee(found);
    },
    getEmployeesByPosition: async (position) => {
      const stored = getStore("ekinerja_employees");
      return stored.filter((e) => e.position === position).map(toEmployee);
    },
    getEmployeesByRegion: async (region) => {
      const stored = getStore("ekinerja_employees");
      return stored.filter((e) => e.region === region).map(toEmployee);
    },
    getAllWorkTargets: async () => {
      const stored = getStore("ekinerja_targets");
      return stored.map(toWorkTarget);
    },
    createWorkTarget: async (t) => {
      const stored = getStore("ekinerja_targets");
      const newId = nextId();
      const newT = {
        ...fromWorkTarget(t),
        id: Number(newId),
        createdAt: Date.now()
      };
      stored.push(newT);
      setStore("ekinerja_targets", stored);
      return newId;
    },
    updateWorkTarget: async (id, t) => {
      const stored = getStore("ekinerja_targets");
      const idx = stored.findIndex((item) => item.id === Number(id));
      if (idx !== -1) {
        stored[idx] = {
          ...fromWorkTarget(t),
          id: Number(id),
          createdAt: stored[idx].createdAt
        };
        setStore("ekinerja_targets", stored);
      }
    },
    deleteWorkTarget: async (id) => {
      const stored = getStore("ekinerja_targets");
      setStore(
        "ekinerja_targets",
        stored.filter((t) => t.id !== Number(id))
      );
    },
    getWorkTargetsByEmployeeId: async (empId) => {
      const stored = getStore("ekinerja_targets");
      return stored.filter((t) => t.employeeId === Number(empId)).map(toWorkTarget);
    },
    getWorkTargetsByPeriod: async (period) => {
      const stored = getStore("ekinerja_targets");
      return stored.filter((t) => t.period === period).map(toWorkTarget);
    },
    getAllWorkRealizations: async () => {
      const stored = getStore("ekinerja_realizations");
      return stored.map(toWorkRealization);
    },
    createWorkRealization: async (targetId, employeeId, realizedValue, supervisorNotes) => {
      const targets = getStore("ekinerja_targets");
      const target = targets.find((t) => t.id === Number(targetId));
      const targetValue = (target == null ? void 0 : target.targetValue) || 100;
      const achievementPercent = realizedValue / targetValue * 100;
      let rating;
      if (achievementPercent >= 80) rating = WorkRating.baik;
      else if (achievementPercent >= 60) rating = WorkRating.cukup;
      else rating = WorkRating.kurang;
      const stored = getStore("ekinerja_realizations");
      const newId = nextId();
      stored.push({
        id: Number(newId),
        targetId: Number(targetId),
        employeeId: Number(employeeId),
        realizedValue,
        supervisorNotes,
        achievementPercent,
        rating,
        evaluatedAt: Date.now()
      });
      setStore("ekinerja_realizations", stored);
      return newId;
    },
    updateWorkRealization: async (id, realizedValue, supervisorNotes) => {
      const stored = getStore("ekinerja_realizations");
      const idx = stored.findIndex((r) => r.id === Number(id));
      if (idx !== -1) {
        const targets = getStore("ekinerja_targets");
        const target = targets.find((t) => t.id === stored[idx].targetId);
        const targetValue = (target == null ? void 0 : target.targetValue) || 100;
        const achievementPercent = realizedValue / targetValue * 100;
        let rating;
        if (achievementPercent >= 80) rating = WorkRating.baik;
        else if (achievementPercent >= 60) rating = WorkRating.cukup;
        else rating = WorkRating.kurang;
        stored[idx] = {
          ...stored[idx],
          realizedValue,
          supervisorNotes,
          achievementPercent,
          rating,
          evaluatedAt: Date.now()
        };
        setStore("ekinerja_realizations", stored);
      }
    },
    deleteWorkRealization: async (id) => {
      const stored = getStore("ekinerja_realizations");
      setStore(
        "ekinerja_realizations",
        stored.filter((r) => r.id !== Number(id))
      );
    },
    getWorkRealizationsByEmployeeId: async (empId) => {
      const stored = getStore("ekinerja_realizations");
      return stored.filter((r) => r.employeeId === Number(empId)).map(toWorkRealization);
    },
    getWorkRealizationsByTargetId: async (targetId) => {
      const stored = getStore("ekinerja_realizations");
      return stored.filter((r) => r.targetId === Number(targetId)).map(toWorkRealization);
    },
    getWorkRealizationsByRating: async (rating) => {
      const stored = getStore("ekinerja_realizations");
      return stored.filter((r) => r.rating === rating).map(toWorkRealization);
    },
    getAllAuditLogs: async () => [],
    getAuditLogsByUserId: async (_userId) => [],
    listApprovals: async () => [],
    requestApproval: async () => {
    },
    setApproval: async (_user, _status) => {
    },
    assignCallerUserRole: async (_user, _role) => {
    },
    uploadEmployeePhoto: async (_id, _photo) => {
    }
    // Internal method used by useActor – not in interface, safe to no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
}
export {
  createLocalBackend
};
