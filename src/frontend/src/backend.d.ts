import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface WorkRealization {
    id: WorkRealizationId;
    achievementPercent: number;
    evaluatedAt: bigint;
    supervisorNotes: string;
    employeeId: EmployeeId;
    rating: WorkRating;
    targetId: WorkTargetId;
    realizedValue: number;
}
export interface AuditLog {
    id: bigint;
    action: string;
    userId: Principal;
    description: string;
    timestamp: bigint;
}
export type WorkRealizationId = bigint;
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export type Region = string;
export type WorkTargetId = bigint;
export type EmployeeId = bigint;
export interface Employee {
    id: EmployeeId;
    nip: string;
    region: Region;
    status: Status;
    birthDate: bigint;
    createdAt: bigint;
    role: Role;
    fullName: string;
    birthPlace: string;
    email: string;
    updatedAt: bigint;
    gender: Gender;
    phone: string;
    photo?: ExternalBlob;
    position: string;
}
export interface WorkTarget {
    id: WorkTargetId;
    activityType: string;
    period: string;
    createdAt: bigint;
    unit: string;
    employeeId: EmployeeId;
    indicator: string;
    targetValue: number;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum Gender {
    female = "female",
    male = "male"
}
export enum Role {
    admin = "admin",
    penyuluh = "penyuluh"
}
export enum Status {
    active = "active",
    inactive = "inactive"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum WorkRating {
    baik = "baik",
    cukup = "cukup",
    kurang = "kurang"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createEmployee(employee: Employee): Promise<EmployeeId>;
    createWorkRealization(targetId: WorkTargetId, employeeId: EmployeeId, realizedValue: number, supervisorNotes: string): Promise<WorkRealizationId>;
    createWorkTarget(workTarget: WorkTarget): Promise<WorkTargetId>;
    deleteEmployee(id: EmployeeId): Promise<void>;
    deleteWorkRealization(id: WorkRealizationId): Promise<void>;
    deleteWorkTarget(id: WorkTargetId): Promise<void>;
    getAllAuditLogs(): Promise<Array<AuditLog>>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllWorkRealizations(): Promise<Array<WorkRealization>>;
    getAllWorkTargets(): Promise<Array<WorkTarget>>;
    getAuditLogsByUserId(userId: Principal): Promise<Array<AuditLog>>;
    getCallerUserRole(): Promise<UserRole>;
    getEmployee(id: EmployeeId): Promise<Employee>;
    getEmployeesByPosition(position: string): Promise<Array<Employee>>;
    getEmployeesByRegion(region: Region): Promise<Array<Employee>>;
    getWorkRealizationsByEmployeeId(employeeId: EmployeeId): Promise<Array<WorkRealization>>;
    getWorkRealizationsByRating(rating: WorkRating): Promise<Array<WorkRealization>>;
    getWorkRealizationsByTargetId(targetId: WorkTargetId): Promise<Array<WorkRealization>>;
    getWorkTargetsByEmployeeId(employeeId: EmployeeId): Promise<Array<WorkTarget>>;
    getWorkTargetsByPeriod(period: string): Promise<Array<WorkTarget>>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    requestApproval(): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateEmployee(id: EmployeeId, employee: Employee): Promise<void>;
    updateWorkRealization(id: WorkRealizationId, realizedValue: number, supervisorNotes: string): Promise<void>;
    updateWorkTarget(id: WorkTargetId, workTarget: WorkTarget): Promise<void>;
    uploadEmployeePhoto(id: EmployeeId, photo: ExternalBlob): Promise<void>;
}
