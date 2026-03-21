export interface ParsedParameter {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

export interface ParsedLabResult {
  labName?: string;
  collectionDate?: string;
  parameters: ParsedParameter[];
  rawText: string;
}

export interface OCRDetection {
  text: string;
  score: number;
  bbox: Array<{ x: number; y: number }>;
}

function normalizeNumber(str: string): number | null {
  const cleaned = str.replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// OCR often merges or corrupts unit strings — normalize common lab units
const UNIT_CORRECTIONS: Record<string, string> = {
  mgdl: "mg/dl",
  mgldl: "mg/dl",
  mgld: "mg/dl",
  "mg/d": "mg/dl",
  ugdl: "µg/dl",
  ugldl: "µg/dl",
  ugldi: "µg/dl",
  "ug/dl": "µg/dl",
  "ug/d": "µg/dl",
  mmoll: "mmol/L",
  "mmol/l": "mmol/L",
  mmolll: "mmol/L",
  mgl: "mg/l",
  "mg/i": "mg/l",
  ul: "U/l",
  "u/i": "U/l",
  "u/l": "U/l",
  ull: "U/l",
  uli: "U/l",
  "10a3ul": "10^3/µL",
  "103ul": "10^3/µL",
  "10a6ul": "10^6/µL",
  "106ul": "10^6/µL",
  gdl: "g/dl",
  gldl: "g/dl",
  fl: "fL",
  pg: "pg",
};

function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, "");
  return UNIT_CORRECTIONS[lower] ?? raw;
}

// Unit pattern — supports µg/dl, mmol/L, U/l, mg/dl, 10^3/uL, etc.
const UNIT = "[\\w/%^*·µ]+(?:\\/\\w+)?";
// Optional "Norma" column marker (~/H/L/N) found in Polish lab results
const NORMA_MARKER = "(?:[~HLN]\\s+)?";
// Reference range: min - max
const REF_RANGE = `[\\[(]?\\s*([\\d]+[.,]?\\d*)\\s*[-–—]\\s*([\\d]+[.,]?\\d*)\\s*[\\])]?`;
// Single reference value (max only, e.g. "200")
const REF_SINGLE = `([\\d]+[.,]?\\d*)`;

const PARAM_PATTERNS = [
  // name ... value ... unit ... [~/H] ... min - max
  new RegExp(`^(.+?)\\s{2,}([\\d]+[.,]?\\d*)\\s+(${UNIT})\\s+${NORMA_MARKER}${REF_RANGE}`),
  // name ... value ... unit ... [~/H] ... single ref value (max only)
  new RegExp(`^(.+?)\\s{2,}([\\d]+[.,]?\\d*)\\s+(${UNIT})\\s+${NORMA_MARKER}${REF_SINGLE}\\s*$`),
  // name ... value ... unit (no reference range)
  new RegExp(`^(.+?)\\s{2,}([\\d]+[.,]?\\d*)\\s+(${UNIT})\\s*$`),
  // tab-separated with [~/H] ... min - max
  new RegExp(`^(.+?)\\t+([\\d]+[.,]?\\d*)\\t+(${UNIT})\\t+${NORMA_MARKER}${REF_RANGE}`),
  // tab-separated with [~/H] ... single ref value
  new RegExp(`^(.+?)\\t+([\\d]+[.,]?\\d*)\\t+(${UNIT})\\t+${NORMA_MARKER}${REF_SINGLE}\\s*$`),
  // tab-separated, no reference
  new RegExp(`^(.+?)\\t+([\\d]+[.,]?\\d*)\\t+(${UNIT})$`),
];

const DATE_PATTERNS = [
  /(\d{2})[./-](\d{2})[./-](\d{4})/, // DD.MM.YYYY
  /(\d{4})[./-](\d{2})[./-](\d{2})/, // YYYY-MM-DD
];

const LAB_KEYWORDS = [
  "diagnostyka",
  "alab",
  "synevo",
  "medicover",
  "lux med",
  "luxmed",
  "centrum",
  "laboratorium",
  "lab ",
  "medical",
];

// Section headers to skip (lines that look like parameters but aren't)
const SECTION_HEADERS = [
  "biochemia",
  "hematologia",
  "elektrolity",
  "lipidogram",
  "próby wątrobowe",
  "proby watrobowe",
  "koagulologia",
  "immunologia",
  "serologia",
  "hormon",
  "badanie:",
  "wynik:",
  "jedn:",
  "norma:",
  "zakr. referencyjne",
];

export function parseOcrText(text: string): ParsedLabResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const parameters: ParsedParameter[] = [];
  let labName: string | undefined;
  let collectionDate: string | undefined;

  for (const line of lines) {
    if (!labName) {
      const lower = line.toLowerCase();
      for (const keyword of LAB_KEYWORDS) {
        if (lower.includes(keyword)) {
          labName = line;
          break;
        }
      }
    }

    if (!collectionDate) {
      for (const pattern of DATE_PATTERNS) {
        const dateMatch = line.match(pattern);
        if (dateMatch) {
          if (dateMatch[1].length === 4) {
            collectionDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          } else {
            collectionDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          }
          break;
        }
      }
    }

    // Skip section headers
    const lowerLine = line.toLowerCase();
    if (SECTION_HEADERS.some((h) => lowerLine.includes(h))) continue;

    for (let pi = 0; pi < PARAM_PATTERNS.length; pi++) {
      const match = line.match(PARAM_PATTERNS[pi]);
      if (match) {
        const name = match[1].trim();
        const value = normalizeNumber(match[2]);
        const unit = normalizeUnit(match[3].trim());

        if (value === null) continue;
        if (
          name.toLowerCase().includes("nazwa") ||
          name.toLowerCase().includes("parametr")
        )
          continue;

        const param: ParsedParameter = { name, value, unit };

        // Patterns 0, 3 have min-max range (match[4]=min, match[5]=max)
        // Patterns 1, 4 have single ref value (match[4]=max only)
        const isSingleRefPattern = pi === 1 || pi === 4;

        if (isSingleRefPattern && match[4]) {
          const refMax = normalizeNumber(match[4]);
          if (refMax !== null) param.referenceMax = refMax;
        } else if (match[4] && match[5]) {
          const refMin = normalizeNumber(match[4]);
          const refMax = normalizeNumber(match[5]);
          if (refMin !== null) param.referenceMin = refMin;
          if (refMax !== null) param.referenceMax = refMax;
        }

        parameters.push(param);
        break;
      }
    }
  }

  return { labName, collectionDate, parameters, rawText: text };
}

function getBboxCenter(bbox: Array<{ x: number; y: number }>): {
  x: number;
  y: number;
} {
  const sumX = bbox.reduce((s, p) => s + p.x, 0);
  const sumY = bbox.reduce((s, p) => s + p.y, 0);
  return { x: sumX / bbox.length, y: sumY / bbox.length };
}

function getBboxHeight(bbox: Array<{ x: number; y: number }>): number {
  const ys = bbox.map((p) => p.y);
  return Math.max(...ys) - Math.min(...ys);
}

export function parseOcrDetections(
  detections: OCRDetection[]
): ParsedLabResult {
  if (detections.length === 0) {
    return { parameters: [], rawText: "" };
  }

  // Filter low-confidence detections
  const filtered = detections.filter((d) => d.score >= 0.3);
  if (filtered.length === 0) {
    return { parameters: [], rawText: "" };
  }

  // Calculate centers and sort by Y
  const withCenters = filtered.map((d) => ({
    detection: d,
    center: getBboxCenter(d.bbox),
    height: getBboxHeight(d.bbox),
  }));

  withCenters.sort((a, b) => a.center.y - b.center.y);

  // Group into lines — detections within half average height are on the same line
  const avgHeight =
    withCenters.reduce((s, w) => s + w.height, 0) / withCenters.length;
  const lineThreshold = Math.max(avgHeight * 0.5, 10);

  const lines: (typeof withCenters)[] = [];
  let currentLine: typeof withCenters = [withCenters[0]];

  for (let i = 1; i < withCenters.length; i++) {
    const prev = currentLine[0];
    const curr = withCenters[i];
    if (Math.abs(curr.center.y - prev.center.y) <= lineThreshold) {
      currentLine.push(curr);
    } else {
      lines.push(currentLine);
      currentLine = [curr];
    }
  }
  lines.push(currentLine);

  // Within each line, sort by X and join text
  const textLines = lines.map((line) => {
    line.sort((a, b) => a.center.x - b.center.x);

    let result = "";
    for (let i = 0; i < line.length; i++) {
      if (i > 0) {
        const gap = line[i].center.x - line[i - 1].center.x;
        const prevWidth =
          Math.max(...line[i - 1].detection.bbox.map((p) => p.x)) -
          Math.min(...line[i - 1].detection.bbox.map((p) => p.x));
        // Use tab for large gaps (likely separate columns), space otherwise
        result += gap > prevWidth * 1.5 ? "\t" : " ";
      }
      result += line[i].detection.text;
    }
    return result;
  });

  const fullText = textLines.join("\n");
  return parseOcrText(fullText);
}
