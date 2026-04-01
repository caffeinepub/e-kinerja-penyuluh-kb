import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import UserApproval "user-approval/approval";

actor {
  // Mixins & State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let approvalState = UserApproval.initState(accessControlState);

  type Gender = { #male; #female };
  type Role = { #admin; #penyuluh };
  type Status = { #active; #inactive };
  type WorkRating = { #baik; #cukup; #kurang };

  module WorkRating {
    public func compare(target1 : WorkRating, target2 : WorkRating) : Order.Order {
      switch (target1, target2) {
        case (#baik, #baik) { #equal };
        case (#baik, _) { #greater };
        case (#cukup, #baik) { #less };
        case (#cukup, #cukup) { #equal };
        case (#cukup, #kurang) { #greater };
        case (#kurang, #kurang) { #equal };
        case (#kurang, _) { #less };
      };
    };
  };

  type EmployeeId = Nat;
  type WorkTargetId = Nat;
  type WorkRealizationId = Nat;
  type Region = Text;

  var nextEmployeeId = 1;
  var nextWorkTargetId = 1;
  var nextWorkRealizationId = 1;
  var nextAuditLogId = 1;

  type Employee = {
    id : EmployeeId;
    nip : Text;
    fullName : Text;
    birthPlace : Text;
    birthDate : Int;
    gender : Gender;
    position : Text;
    region : Region;
    phone : Text;
    email : Text;
    role : Role;
    status : Status;
    photo : ?Storage.ExternalBlob;
    createdAt : Int;
    updatedAt : Int;
  };

  type WorkTarget = {
    id : WorkTargetId;
    employeeId : EmployeeId;
    period : Text;
    activityType : Text;
    indicator : Text;
    unit : Text;
    targetValue : Float;
    createdAt : Int;
  };

  type WorkRealization = {
    id : WorkRealizationId;
    targetId : WorkTargetId;
    employeeId : EmployeeId;
    realizedValue : Float;
    achievementPercent : Float;
    rating : WorkRating;
    supervisorNotes : Text;
    evaluatedAt : Int;
  };

  type AuditLog = {
    id : Nat;
    userId : Principal;
    action : Text;
    description : Text;
    timestamp : Int;
  };

  module Employee {
    public func compare(employee1 : Employee, employee2 : Employee) : Order.Order {
      Nat.compare(employee1.id, employee2.id);
    };
  };

  module WorkTarget {
    public func compare(target1 : WorkTarget, target2 : WorkTarget) : Order.Order {
      Nat.compare(target1.id, target2.id);
    };
  };

  module WorkRealization {
    public func compare(target1 : WorkRealization, target2 : WorkRealization) : Order.Order {
      Nat.compare(target1.id, target2.id);
    };
  };

  module AuditLog {
    public func compare(log1 : AuditLog, log2 : AuditLog) : Order.Order {
      Nat.compare(log1.id, log2.id);
    };
  };

  let employees = Map.empty<EmployeeId, Employee>();
  let workTargets = Map.empty<WorkTargetId, WorkTarget>();
  let workRealizations = Map.empty<WorkRealizationId, WorkRealization>();
  let auditLogs = Map.empty<Nat, AuditLog>();

  func getEmployeeInternal(id : EmployeeId) : Employee {
    switch (employees.get(id)) {
      case (?employee) { employee };
      case (null) { Runtime.trap("Employee not found") };
    };
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func createEmployee(employee : Employee) : async EmployeeId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create employees");
    };

    let employeeId = nextEmployeeId;
    nextEmployeeId += 1;

    let newEmployee : Employee = {
      employee with
      id = employeeId;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    employees.add(employeeId, newEmployee);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "CREATE_EMPLOYEE";
      description = "Created employee " # employee.fullName;
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;

    employeeId;
  };

  public shared ({ caller }) func updateEmployee(id : EmployeeId, employee : Employee) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update employees");
    };

    let existing = getEmployeeInternal(id);
    let newEmployee : Employee = {
      existing with
      nip = employee.nip;
      fullName = employee.fullName;
      birthPlace = employee.birthPlace;
      birthDate = employee.birthDate;
      gender = employee.gender;
      position = employee.position;
      region = employee.region;
      phone = employee.phone;
      email = employee.email;
      role = employee.role;
      status = employee.status;
      photo = employee.photo;
      updatedAt = Time.now();
    };
    employees.add(id, newEmployee);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "UPDATE_EMPLOYEE";
      description = "Updated employee " # employee.fullName;
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public shared ({ caller }) func deleteEmployee(id : EmployeeId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete employees");
    };
    employees.remove(id);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "DELETE_EMPLOYEE";
      description = "Deleted employee with ID " # id.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all employees");
    };
    employees.values().toArray().sort();
  };

  public query ({ caller }) func getEmployee(id : EmployeeId) : async Employee {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view employee details");
    };
    getEmployeeInternal(id);
  };

  public query ({ caller }) func getEmployeesByRegion(region : Region) : async [Employee] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view filtered employees");
    };
    employees.values().toArray().filter(func(e) { Text.equal(e.region, region) });
  };

  public query ({ caller }) func getEmployeesByPosition(position : Text) : async [Employee] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view filtered employees");
    };
    employees.values().toArray().filter(func(e) { Text.equal(e.position, position) });
  };

  public shared ({ caller }) func createWorkTarget(workTarget : WorkTarget) : async WorkTargetId {
    let employee = getEmployeeInternal(workTarget.employeeId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create work targets");
    };

    let workTargetId = nextWorkTargetId;
    nextWorkTargetId += 1;

    let newWorkTarget : WorkTarget = {
      workTarget with
      id = workTargetId;
      createdAt = Time.now();
    };
    workTargets.add(workTargetId, newWorkTarget);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "CREATE_WORK_TARGET";
      description = "Created work target for employee " # employee.fullName;
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;

    workTargetId;
  };

  func getWorkTargetInternal(id : WorkTargetId) : WorkTarget {
    switch (workTargets.get(id)) {
      case (?target) { target };
      case (null) { Runtime.trap("WorkTarget not found") };
    };
  };

  public shared ({ caller }) func updateWorkTarget(id : WorkTargetId, workTarget : WorkTarget) : async () {
    let existing = getWorkTargetInternal(id);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update work targets");
    };

    let newWorkTarget : WorkTarget = {
      existing with
      period = workTarget.period;
      activityType = workTarget.activityType;
      indicator = workTarget.indicator;
      unit = workTarget.unit;
      targetValue = workTarget.targetValue;
    };
    workTargets.add(id, newWorkTarget);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "UPDATE_WORK_TARGET";
      description = "Updated work target for employeeId: " # workTarget.employeeId.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public shared ({ caller }) func deleteWorkTarget(id : WorkTargetId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete work targets");
    };
    workTargets.remove(id);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "DELETE_WORK_TARGET";
      description = "Deleted work target with ID " # id.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public query ({ caller }) func getAllWorkTargets() : async [WorkTarget] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all work targets");
    };
    workTargets.values().toArray().sort();
  };

  public query ({ caller }) func getWorkTargetsByEmployeeId(employeeId : EmployeeId) : async [WorkTarget] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view work targets");
    };
    workTargets.values().toArray().filter(func(t) { t.employeeId == employeeId });
  };

  public query ({ caller }) func getWorkTargetsByPeriod(period : Text) : async [WorkTarget] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view filtered work targets");
    };
    workTargets.values().toArray().filter(func(t) { Text.equal(t.period, period) });
  };

  func calculateRating(achievementPercent : Float) : WorkRating {
    if (achievementPercent >= 80.0) { #baik } else if (achievementPercent >= 60.0) { #cukup } else {
      #kurang;
    };
  };

  public shared ({ caller }) func createWorkRealization(targetId : WorkTargetId, employeeId : EmployeeId, realizedValue : Float, supervisorNotes : Text) : async WorkRealizationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create work realizations");
    };

    let target = getWorkTargetInternal(targetId);
    if (target.employeeId != employeeId) {
      Runtime.trap("WorkTarget does not belong to employee");
    };

    let achievementPercent = if (target.targetValue == 0.0) {
      0.0;
    } else {
      (realizedValue / target.targetValue) * 100.0;
    };

    let realizationId = nextWorkRealizationId;
    nextWorkRealizationId += 1;

    let workRealization : WorkRealization = {
      id = realizationId;
      targetId;
      employeeId;
      realizedValue;
      achievementPercent;
      rating = calculateRating(achievementPercent);
      supervisorNotes;
      evaluatedAt = Time.now();
    };

    workRealizations.add(realizationId, workRealization);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "CREATE_WORK_REALIZATION";
      description = "Created work realization for employeeId: " # employeeId.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;

    realizationId;
  };

  func getWorkRealizationInternal(id : WorkRealizationId) : WorkRealization {
    switch (workRealizations.get(id)) {
      case (?realization) { realization };
      case (null) { Runtime.trap("WorkRealization not found") };
    };
  };

  public shared ({ caller }) func updateWorkRealization(id : WorkRealizationId, realizedValue : Float, supervisorNotes : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update work realizations");
    };

    let realization = getWorkRealizationInternal(id);
    let target = getWorkTargetInternal(realization.targetId);

    let achievementPercent = if (target.targetValue == 0.0) {
      0.0;
    } else {
      (realizedValue / target.targetValue) * 100.0;
    };

    let newRealization : WorkRealization = {
      realization with
      realizedValue;
      achievementPercent;
      rating = calculateRating(achievementPercent);
      supervisorNotes;
      evaluatedAt = Time.now();
    };

    workRealizations.add(id, newRealization);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "UPDATE_WORK_REALIZATION";
      description = "Updated work realization with ID " # id.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public shared ({ caller }) func deleteWorkRealization(id : WorkRealizationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete work realizations");
    };
    workRealizations.remove(id);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "DELETE_WORK_REALIZATION";
      description = "Deleted work realization with ID " # id.toText();
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  public query ({ caller }) func getAllWorkRealizations() : async [WorkRealization] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all work realizations");
    };
    workRealizations.values().toArray().sort();
  };

  public query ({ caller }) func getWorkRealizationsByEmployeeId(employeeId : EmployeeId) : async [WorkRealization] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view work realizations");
    };
    workRealizations.values().toArray().filter(func(r) { r.employeeId == employeeId });
  };

  public query ({ caller }) func getWorkRealizationsByTargetId(targetId : WorkTargetId) : async [WorkRealization] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view work realizations");
    };
    workRealizations.values().toArray().filter(func(r) { r.targetId == targetId });
  };

  public query ({ caller }) func getWorkRealizationsByRating(rating : WorkRating) : async [WorkRealization] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view filtered work realizations");
    };
    workRealizations.values().toArray().filter(func(r) { r.rating == rating });
  };

  public query ({ caller }) func getAllAuditLogs() : async [AuditLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view audit logs");
    };
    auditLogs.values().toArray().sort();
  };

  public query ({ caller }) func getAuditLogsByUserId(userId : Principal) : async [AuditLog] {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own audit logs");
    };
    auditLogs.values().toArray().filter(func(log) { log.userId == userId });
  };

  public shared ({ caller }) func uploadEmployeePhoto(id : EmployeeId, photo : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload employee photos");
    };

    let employee = getEmployeeInternal(id);
    let newEmployee : Employee = {
      employee with
      photo = ?photo;
      updatedAt = Time.now();
    };
    employees.add(id, newEmployee);

    let log : AuditLog = {
      id = nextAuditLogId;
      userId = caller;
      action = "UPLOAD_EMPLOYEE_PHOTO";
      description = "Uploaded photo for employee " # employee.fullName;
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };
};
