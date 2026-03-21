export type UserRole =
  | "patient"
  | "doctor"
  | "family_member"
  | "caregiver"
  | "clinic_admin"
  | "lab_technician"
  | "employer_hr"
  | "super_admin";

export type ParameterStatus = "normal" | "elevated" | "low" | "critical";

export type UploadSource =
  | "patient_manual"
  | "patient_scan"
  | "lab_webhook"
  | "family_member"
  | "clinic_import";

export type OcrStatus = "pending" | "processing" | "done" | "manual";

export type MedicalSegment =
  | "diabetic_t1"
  | "diabetic_t2"
  | "thyroid"
  | "pregnancy"
  | "cardiac"
  | "general";
