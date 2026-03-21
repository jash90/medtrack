import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser } from "./auth";

export type Action =
  | "results:view"
  | "results:upload"
  | "results:delete"
  | "parameters:view"
  | "reminders:create"
  | "reminders:manage"
  | "sharing:create"
  | "family:manage"
  | "clinic:view_all_patients"
  | "employer:view_aggregate";

type UserRole =
  | "patient"
  | "doctor"
  | "family_member"
  | "caregiver"
  | "clinic_admin"
  | "lab_technician"
  | "employer_hr"
  | "super_admin";

const rolePermissions: Record<UserRole, Action[]> = {
  patient: [
    "results:view",
    "results:upload",
    "results:delete",
    "parameters:view",
    "reminders:create",
    "sharing:create",
  ],
  family_member: [
    "results:view",
    "results:upload",
    "parameters:view",
    "reminders:create",
    "reminders:manage",
  ],
  caregiver: [
    "results:view",
    "results:upload",
    "parameters:view",
    "reminders:create",
    "reminders:manage",
  ],
  doctor: ["results:view", "parameters:view", "reminders:create"],
  clinic_admin: [
    "results:view",
    "parameters:view",
    "reminders:manage",
    "clinic:view_all_patients",
  ],
  lab_technician: ["results:upload"],
  employer_hr: ["employer:view_aggregate"],
  super_admin: [
    "results:view",
    "results:upload",
    "results:delete",
    "parameters:view",
    "reminders:create",
    "reminders:manage",
    "sharing:create",
    "family:manage",
    "clinic:view_all_patients",
    "employer:view_aggregate",
  ],
};

export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  action: Action,
  targetUserId?: Id<"users">
): Promise<boolean> {
  const currentUser = await getCurrentUser(ctx);

  // Owner always has access to own data
  if (targetUserId && currentUser._id === targetUserId) return true;

  const allowed = rolePermissions[currentUser.role as UserRole] ?? [];
  if (!allowed.includes(action)) return false;

  // For roles accessing other users' data — verify link
  if (targetUserId && currentUser.role === "doctor") {
    const link = await ctx.db
      .query("patientDoctorLinks")
      .withIndex("by_doctor", (q) => q.eq("doctorId", currentUser._id))
      .filter((q) => q.eq(q.field("patientId"), targetUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    return !!link;
  }

  if (
    targetUserId &&
    (currentUser.role === "family_member" || currentUser.role === "caregiver")
  ) {
    const link = await ctx.db
      .query("familyLinks")
      .withIndex("by_owner", (q) => q.eq("ownerId", currentUser._id))
      .filter((q) => q.eq(q.field("memberId"), targetUserId))
      .first();
    return !!link;
  }

  return true;
}
