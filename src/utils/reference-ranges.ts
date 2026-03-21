import type { MedicalSegment } from "../types";

interface PatientProfile {
  age: number;
  sex: "M" | "F";
  segment: MedicalSegment;
  isPregnant?: boolean;
  pregnancyWeek?: number;
}

interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
}

const defaultRanges: Record<string, ReferenceRange> = {
  HGB: { min: 12.0, max: 17.5, unit: "g/dL" },
  WBC: { min: 4.0, max: 11.0, unit: "10^3/µL" },
  RBC: { min: 4.0, max: 5.5, unit: "10^6/µL" },
  PLT: { min: 150, max: 400, unit: "10^3/µL" },
  GLU: { min: 70, max: 100, unit: "mg/dL" },
  HbA1c: { min: 4.0, max: 5.6, unit: "%" },
  TSH: { min: 0.4, max: 4.0, unit: "mIU/L" },
  FT4: { min: 0.8, max: 1.8, unit: "ng/dL" },
  CHOL: { min: 0, max: 200, unit: "mg/dL" },
  LDL: { min: 0, max: 100, unit: "mg/dL" },
  HDL: { min: 40, max: 200, unit: "mg/dL" },
  TG: { min: 0, max: 150, unit: "mg/dL" },
  CREAT: { min: 0.6, max: 1.2, unit: "mg/dL" },
  ALT: { min: 0, max: 40, unit: "U/L" },
  AST: { min: 0, max: 40, unit: "U/L" },
  CRP: { min: 0, max: 5, unit: "mg/L" },
};

export function getReferenceRange(
  parameterName: string,
  profile?: PatientProfile
): ReferenceRange | undefined {
  const key = parameterName.toUpperCase();

  if (profile?.isPregnant && key === "TSH") {
    if (profile.pregnancyWeek! <= 12) return { min: 0.1, max: 2.5, unit: "mIU/L" };
    if (profile.pregnancyWeek! <= 27) return { min: 0.2, max: 3.0, unit: "mIU/L" };
    return { min: 0.3, max: 3.0, unit: "mIU/L" };
  }

  if (profile?.segment === "diabetic_t1" || profile?.segment === "diabetic_t2") {
    if (key === "HBA1C") return { min: 0, max: 7.0, unit: "%" };
    if (key === "GLU") return { min: 70, max: 130, unit: "mg/dL" };
  }

  if (profile?.sex === "F" && key === "HGB") {
    return { min: 12.0, max: 16.0, unit: "g/dL" };
  }

  if (profile?.sex === "M" && key === "HGB") {
    return { min: 13.5, max: 17.5, unit: "g/dL" };
  }

  return defaultRanges[key];
}
