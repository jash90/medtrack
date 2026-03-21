import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("patient"),
      v.literal("doctor"),
      v.literal("family_member"),
      v.literal("caregiver"),
      v.literal("clinic_admin"),
      v.literal("lab_technician"),
      v.literal("employer_hr"),
      v.literal("super_admin")
    ),
    dateOfBirth: v.optional(v.string()),
    medicalSegment: v.optional(v.string()),
    authorizedLabs: v.optional(v.array(v.string())),
    pushToken: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    // Faza 2+ fields
    doctorLicenseNumber: v.optional(v.string()),
    specialization: v.optional(v.string()),
    clinicId: v.optional(v.id("clinics")),
    employerId: v.optional(v.id("employers")),
  })
    .index("email", ["email"])
    .index("by_role", ["role"])
    .index("by_clinic", ["clinicId"]),

  // Faza 2b — relacja pacjent ↔ lekarz
  patientDoctorLinks: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    accessLevel: v.union(v.literal("full"), v.literal("filtered")),
    parameterFilter: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("revoked")
    ),
    expiresAt: v.optional(v.number()),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"]),

  // Faza 2a — relacja pacjent ↔ rodzina
  familyLinks: defineTable({
    ownerId: v.id("users"),
    memberId: v.id("users"),
    relationship: v.string(),
    permissions: v.array(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_member", ["memberId"]),

  // Faza 3 — kliniki B2B
  clinics: defineTable({
    name: v.string(),
    nip: v.string(),
    subscriptionPlan: v.union(
      v.literal("basic"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    labIntegrations: v.optional(v.array(v.string())),
    isActive: v.boolean(),
  }),

  // Faza 4 — pracodawcy
  employers: defineTable({
    name: v.string(),
    nip: v.string(),
    employeeCount: v.optional(v.number()),
    subscriptionPlan: v.string(),
    isActive: v.boolean(),
  }),

  labResults: defineTable({
    userId: v.id("users"),
    uploadedBy: v.id("users"),
    uploadSource: v.union(
      v.literal("patient_manual"),
      v.literal("patient_scan"),
      v.literal("lab_webhook"),
      v.literal("family_member"),
      v.literal("clinic_import")
    ),
    labName: v.string(),
    collectionDate: v.string(),
    fileId: v.optional(v.id("_storage")),
    ocrStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("manual")
    ),
    ocrParsedData: v.optional(v.string()),
    ocrRawText: v.optional(v.string()),
    ocrError: v.optional(v.string()),
    notes: v.optional(v.string()),
    clinicId: v.optional(v.id("clinics")),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "collectionDate"])
    .index("by_clinic", ["clinicId"]),

  parameters: defineTable({
    resultId: v.id("labResults"),
    userId: v.id("users"),
    name: v.string(),
    value: v.number(),
    unit: v.string(),
    referenceMin: v.optional(v.number()),
    referenceMax: v.optional(v.number()),
    status: v.union(
      v.literal("normal"),
      v.literal("elevated"),
      v.literal("low"),
      v.literal("critical")
    ),
    collectionDate: v.string(),
  })
    .index("by_result", ["resultId"])
    .index("by_user_name_date", ["userId", "name", "collectionDate"]),

  reminders: defineTable({
    userId: v.id("users"),
    createdBy: v.id("users"),
    title: v.string(),
    examType: v.string(),
    scheduledAt: v.number(),
    repeatIntervalDays: v.optional(v.number()),
    isActive: v.boolean(),
    pushSent: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_scheduled", ["scheduledAt", "isActive"]),

  alerts: defineTable({
    userId: v.id("users"),
    parameterId: v.id("parameters"),
    type: v.union(v.literal("out_of_range"), v.literal("critical")),
    message: v.string(),
    isRead: v.boolean(),
    notifiedDoctors: v.optional(v.array(v.id("users"))),
  }).index("by_user_unread", ["userId", "isRead"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    conversationId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
  })
    .index("by_user_conversationId", ["userId", "conversationId"]),

  sharingTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    doctorEmail: v.optional(v.string()),
    accessLevel: v.union(v.literal("full"), v.literal("filtered")),
    parameterFilter: v.optional(v.array(v.string())),
    expiresAt: v.number(),
    viewCount: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
});
