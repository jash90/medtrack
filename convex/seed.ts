import { internalMutation } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Pre-computed Scrypt hash for "MedTrack2026!" (generated via lucia Scrypt)
const SEED_PASSWORD_HASH =
  "9e07bae867921353395ca8f09a725673:2b77c0b04af5ecb7db855eb0dce3d4ec952a61f7b397dc440421d3751a948587e7dd31bc18e4eed7af1d49a2449a31ec3c41db4d7a61be4aeaaee8cf7d19b4d5";

function computeStatus(
  value: number,
  referenceMin?: number,
  referenceMax?: number
): "normal" | "elevated" | "low" | "critical" {
  if (referenceMin === undefined && referenceMax === undefined) return "normal";

  if (referenceMax !== undefined && value > referenceMax) {
    const overshoot = (value - referenceMax) / referenceMax;
    return overshoot > 0.2 ? "critical" : "elevated";
  }

  if (referenceMin !== undefined && value < referenceMin) {
    const undershoot = (referenceMin - value) / referenceMin;
    return undershoot > 0.2 ? "critical" : "low";
  }

  return "normal";
}

async function createUserWithAuth(
  ctx: MutationCtx,
  userData: {
    email: string;
    name: string;
    role: "patient" | "doctor" | "family_member" | "caregiver" | "clinic_admin" | "lab_technician" | "employer_hr" | "super_admin";
    dateOfBirth?: string;
    medicalSegment?: string;
    doctorLicenseNumber?: string;
    specialization?: string;
  }
): Promise<Id<"users">> {
  const userId = await ctx.db.insert("users", userData);

  await ctx.db.insert("authAccounts", {
    userId,
    provider: "password",
    providerAccountId: userData.email,
    secret: SEED_PASSWORD_HASH,
  });

  return userId;
}

interface ParameterInput {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

async function insertLabResultWithParams(
  ctx: MutationCtx,
  userId: Id<"users">,
  labResult: {
    labName: string;
    collectionDate: string;
    uploadSource: "patient_manual" | "patient_scan" | "lab_webhook" | "family_member" | "clinic_import";
    notes?: string;
  },
  parameters: ParameterInput[]
) {
  const resultId = await ctx.db.insert("labResults", {
    userId,
    uploadedBy: userId,
    uploadSource: labResult.uploadSource,
    labName: labResult.labName,
    collectionDate: labResult.collectionDate,
    ocrStatus: "manual",
    notes: labResult.notes,
  });

  for (const param of parameters) {
    const status = computeStatus(param.value, param.referenceMin, param.referenceMax);

    const parameterId = await ctx.db.insert("parameters", {
      resultId,
      userId,
      name: param.name,
      value: param.value,
      unit: param.unit,
      referenceMin: param.referenceMin,
      referenceMax: param.referenceMax,
      status,
      collectionDate: labResult.collectionDate,
    });

    if (status !== "normal") {
      await ctx.db.insert("alerts", {
        userId,
        parameterId,
        type: status === "critical" ? "critical" : "out_of_range",
        message: `${param.name}: ${param.value} ${param.unit} — ${status === "elevated" ? "powyżej normy" : status === "low" ? "poniżej normy" : "wartość krytyczna"}`,
        isRead: false,
      });
    }
  }

  return resultId;
}

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency check
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "seed.healthy@medtrack.test"))
      .take(1);

    if (existing.length > 0) {
      throw new Error(
        "Seed data already exists. Clear the database first or skip seeding."
      );
    }

    // ── Users ──────────────────────────────────────────────────

    const patientT2 = await createUserWithAuth(ctx, {
      email: "seed.diabetic.t2@medtrack.test",
      name: "Jan Kowalski",
      role: "patient",
      dateOfBirth: "1975-03-12",
      medicalSegment: "diabetic_t2",
    });

    const patientThyroid = await createUserWithAuth(ctx, {
      email: "seed.thyroid@medtrack.test",
      name: "Anna Nowak",
      role: "patient",
      dateOfBirth: "1988-07-22",
      medicalSegment: "thyroid",
    });

    const patientCardiac = await createUserWithAuth(ctx, {
      email: "seed.cardiac@medtrack.test",
      name: "Piotr Wiśniewski",
      role: "patient",
      dateOfBirth: "1960-11-05",
      medicalSegment: "cardiac",
    });

    const patientPregnant = await createUserWithAuth(ctx, {
      email: "seed.pregnant@medtrack.test",
      name: "Maria Zielińska",
      role: "patient",
      dateOfBirth: "1995-01-18",
      medicalSegment: "pregnancy",
    });

    const patientHealthy = await createUserWithAuth(ctx, {
      email: "seed.healthy@medtrack.test",
      name: "Tomasz Lewandowski",
      role: "patient",
      dateOfBirth: "1990-06-30",
      medicalSegment: "general",
    });

    const patientT1 = await createUserWithAuth(ctx, {
      email: "seed.diabetic.t1@medtrack.test",
      name: "Katarzyna Wójcik",
      role: "patient",
      dateOfBirth: "2000-09-14",
      medicalSegment: "diabetic_t1",
    });

    const doctor = await createUserWithAuth(ctx, {
      email: "seed.doctor@medtrack.test",
      name: "Dr. Marek Kamiński",
      role: "doctor",
      doctorLicenseNumber: "LEK-12345",
      specialization: "interna",
    });

    const familyMember = await createUserWithAuth(ctx, {
      email: "seed.family@medtrack.test",
      name: "Ewa Kowalska",
      role: "family_member",
    });

    // ── Jan Kowalski — Cukrzyca T2 (poprawa w czasie) ─────────

    await insertLabResultWithParams(
      ctx,
      patientT2,
      { labName: "ALAB", collectionDate: "2025-11-15", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 185, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 8.9, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CHOL", value: 220, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
        { name: "CREAT", value: 1.0, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientT2,
      { labName: "Diagnostyka", collectionDate: "2026-01-20", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 118, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 6.5, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CREAT", value: 1.1, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientT2,
      { labName: "ALAB", collectionDate: "2026-03-10", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 105, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 5.8, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CREAT", value: 0.9, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
      ]
    );

    // ── Anna Nowak — Niedoczynność tarczycy ────────────────────

    await insertLabResultWithParams(
      ctx,
      patientThyroid,
      { labName: "Synevo", collectionDate: "2025-10-05", uploadSource: "patient_manual" },
      [
        { name: "TSH", value: 12.5, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0 },
        { name: "FT4", value: 0.5, unit: "ng/dL", referenceMin: 0.8, referenceMax: 1.8 },
        { name: "CHOL", value: 230, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientThyroid,
      { labName: "Synevo", collectionDate: "2026-02-15", uploadSource: "patient_manual" },
      [
        { name: "TSH", value: 4.6, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0 },
        { name: "FT4", value: 1.1, unit: "ng/dL", referenceMin: 0.8, referenceMax: 1.8 },
        { name: "CHOL", value: 205, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
      ]
    );

    // ── Piotr Wiśniewski — Dyslipidemia / Serce ───────────────

    await insertLabResultWithParams(
      ctx,
      patientCardiac,
      { labName: "Medicover", collectionDate: "2025-12-01", uploadSource: "patient_manual" },
      [
        { name: "CHOL", value: 285, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
        { name: "LDL", value: 180, unit: "mg/dL", referenceMin: 0, referenceMax: 100 },
        { name: "HDL", value: 35, unit: "mg/dL", referenceMin: 40, referenceMax: 200 },
        { name: "TG", value: 175, unit: "mg/dL", referenceMin: 0, referenceMax: 150 },
        { name: "CRP", value: 8.5, unit: "mg/L", referenceMin: 0, referenceMax: 5 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientCardiac,
      { labName: "Medicover", collectionDate: "2026-03-01", uploadSource: "patient_manual" },
      [
        { name: "CHOL", value: 215, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
        { name: "LDL", value: 115, unit: "mg/dL", referenceMin: 0, referenceMax: 100 },
        { name: "HDL", value: 42, unit: "mg/dL", referenceMin: 40, referenceMax: 200 },
        { name: "TG", value: 155, unit: "mg/dL", referenceMin: 0, referenceMax: 150 },
        { name: "CRP", value: 3.2, unit: "mg/L", referenceMin: 0, referenceMax: 5 },
      ]
    );

    // ── Maria Zielińska — Ciąża ────────────────────────────────

    await insertLabResultWithParams(
      ctx,
      patientPregnant,
      { labName: "Diagnostyka", collectionDate: "2026-01-10", uploadSource: "patient_manual" },
      [
        { name: "TSH", value: 3.5, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0 },
        { name: "HGB", value: 11.2, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0 },
        { name: "WBC", value: 10.5, unit: "10^3/µL", referenceMin: 4.0, referenceMax: 11.0 },
        { name: "PLT", value: 180, unit: "10^3/µL", referenceMin: 150, referenceMax: 400 },
        { name: "GLU", value: 88, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientPregnant,
      { labName: "Diagnostyka", collectionDate: "2026-03-05", uploadSource: "patient_manual" },
      [
        { name: "TSH", value: 2.8, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0 },
        { name: "HGB", value: 10.8, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0 },
        { name: "PLT", value: 165, unit: "10^3/µL", referenceMin: 150, referenceMax: 400 },
        { name: "GLU", value: 92, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
      ]
    );

    // ── Tomasz Lewandowski — Zdrowy ────────────────────────────

    await insertLabResultWithParams(
      ctx,
      patientHealthy,
      { labName: "ALAB", collectionDate: "2026-01-05", uploadSource: "patient_manual" },
      [
        { name: "HGB", value: 15.2, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5 },
        { name: "WBC", value: 6.8, unit: "10^3/µL", referenceMin: 4.0, referenceMax: 11.0 },
        { name: "RBC", value: 4.9, unit: "10^6/µL", referenceMin: 4.0, referenceMax: 5.5 },
        { name: "PLT", value: 250, unit: "10^3/µL", referenceMin: 150, referenceMax: 400 },
        { name: "GLU", value: 85, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "CREAT", value: 0.9, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
        { name: "ALT", value: 22, unit: "U/L", referenceMin: 0, referenceMax: 40 },
        { name: "AST", value: 18, unit: "U/L", referenceMin: 0, referenceMax: 40 },
        { name: "CHOL", value: 175, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientHealthy,
      { labName: "ALAB", collectionDate: "2026-03-15", uploadSource: "patient_manual" },
      [
        { name: "HGB", value: 15.5, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5 },
        { name: "WBC", value: 7.1, unit: "10^3/µL", referenceMin: 4.0, referenceMax: 11.0 },
        { name: "GLU", value: 82, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "CHOL", value: 180, unit: "mg/dL", referenceMin: 0, referenceMax: 200 },
      ]
    );

    // ── Katarzyna Wójcik — Cukrzyca T1, wartości krytyczne ────

    await insertLabResultWithParams(
      ctx,
      patientT1,
      { labName: "Synevo", collectionDate: "2025-12-20", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 320, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 11.2, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CREAT", value: 1.6, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
        { name: "ALT", value: 45, unit: "U/L", referenceMin: 0, referenceMax: 40 },
        { name: "CRP", value: 12.0, unit: "mg/L", referenceMin: 0, referenceMax: 5 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientT1,
      { labName: "Diagnostyka", collectionDate: "2026-02-01", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 250, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 9.8, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CREAT", value: 1.5, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
        { name: "CRP", value: 8.0, unit: "mg/L", referenceMin: 0, referenceMax: 5 },
      ]
    );

    await insertLabResultWithParams(
      ctx,
      patientT1,
      { labName: "Synevo", collectionDate: "2026-03-15", uploadSource: "patient_manual" },
      [
        { name: "GLU", value: 195, unit: "mg/dL", referenceMin: 70, referenceMax: 100 },
        { name: "HbA1c", value: 8.5, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
        { name: "CREAT", value: 1.3, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2 },
      ]
    );

    // ── Przypomnienia ──────────────────────────────────────────

    await ctx.db.insert("reminders", {
      userId: patientT2,
      createdBy: patientT2,
      title: "Kontrola HbA1c",
      examType: "HbA1c",
      scheduledAt: new Date("2026-04-15T09:00:00").getTime(),
      repeatIntervalDays: 90,
      isActive: true,
      pushSent: false,
    });

    await ctx.db.insert("reminders", {
      userId: patientThyroid,
      createdBy: patientThyroid,
      title: "Kontrola TSH",
      examType: "TSH",
      scheduledAt: new Date("2026-04-01T10:00:00").getTime(),
      repeatIntervalDays: 60,
      isActive: true,
      pushSent: false,
    });

    await ctx.db.insert("reminders", {
      userId: patientT1,
      createdBy: patientT1,
      title: "Pilna kontrola glukemii",
      examType: "GLU",
      scheduledAt: new Date("2026-03-25T08:00:00").getTime(),
      repeatIntervalDays: 30,
      isActive: true,
      pushSent: false,
    });

    await ctx.db.insert("reminders", {
      userId: patientPregnant,
      createdBy: patientPregnant,
      title: "Badania prenatalne",
      examType: "Morfologia",
      scheduledAt: new Date("2026-04-10T09:00:00").getTime(),
      repeatIntervalDays: 30,
      isActive: true,
      pushSent: false,
    });

    // ── Relacje lekarz-pacjent ─────────────────────────────────

    await ctx.db.insert("patientDoctorLinks", {
      patientId: patientT2,
      doctorId: doctor,
      accessLevel: "full",
      status: "active",
    });

    await ctx.db.insert("patientDoctorLinks", {
      patientId: patientThyroid,
      doctorId: doctor,
      accessLevel: "full",
      status: "active",
    });

    await ctx.db.insert("patientDoctorLinks", {
      patientId: patientT1,
      doctorId: doctor,
      accessLevel: "full",
      status: "active",
    });

    await ctx.db.insert("patientDoctorLinks", {
      patientId: patientCardiac,
      doctorId: doctor,
      accessLevel: "filtered",
      parameterFilter: ["CHOL", "LDL", "HDL", "TG", "CRP"],
      status: "active",
    });

    // ── Relacja rodzinna ───────────────────────────────────────

    await ctx.db.insert("familyLinks", {
      ownerId: patientT2,
      memberId: familyMember,
      relationship: "spouse",
      permissions: ["view_results", "view_alerts", "create_reminders"],
    });

    console.log("Seed completed successfully!");
    console.log("Users: 8, Lab results: 15, Reminders: 4, Doctor links: 4, Family links: 1");
  },
});

export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find seed users first
    const users = await ctx.db.query("users").collect();
    const seedUserIds = new Set<Id<"users">>();

    for (const user of users) {
      if (user.email?.startsWith("seed.") && user.email?.endsWith("@medtrack.test")) {
        seedUserIds.add(user._id);
      }
    }

    if (seedUserIds.size === 0) {
      console.log("No seed data found.");
      return;
    }

    // Delete related data for seed users
    const tables = [
      "alerts",
      "parameters",
      "labResults",
      "reminders",
      "sharingTokens",
      "patientDoctorLinks",
      "familyLinks",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        const hasUserId = "userId" in doc && seedUserIds.has(doc.userId as Id<"users">);
        const hasPatientId = "patientId" in doc && seedUserIds.has(doc.patientId as Id<"users">);
        const hasOwnerId = "ownerId" in doc && seedUserIds.has(doc.ownerId as Id<"users">);
        if (hasUserId || hasPatientId || hasOwnerId) {
          await ctx.db.delete(doc._id);
        }
      }
    }

    // Delete auth accounts and sessions for seed users
    for (const userId of seedUserIds) {
      const authAccounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
        .collect();
      for (const account of authAccounts) {
        await ctx.db.delete(account._id);
      }

      const authSessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      for (const session of authSessions) {
        // Delete refresh tokens for this session
        const refreshTokens = await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const token of refreshTokens) {
          await ctx.db.delete(token._id);
        }
        await ctx.db.delete(session._id);
      }

      await ctx.db.delete(userId);
    }

    console.log(`Seed data cleared! Removed ${seedUserIds.size} users and related data.`);
  },
});