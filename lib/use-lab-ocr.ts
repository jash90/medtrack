import { useState, useCallback, useEffect } from "react";
import { useOCR, OCR_POLISH } from "react-native-executorch";
import type { OCRDetection } from "react-native-executorch";

export type OcrPhase =
  | { phase: "loading-model"; downloadProgress: number }
  | { phase: "ready" }
  | { phase: "processing" }
  | { phase: "done"; rawText: string }
  | { phase: "error"; message: string }
  | { phase: "model-error"; message: string };

function reconstructText(detections: OCRDetection[]): string {
  if (detections.length === 0) return "";

  const filtered = detections.filter((d) => d.score >= 0.3);
  if (filtered.length === 0) return "";

  const withCenters = filtered.map((d) => {
    const bbox = d.bbox;
    const cx = bbox.reduce((s, p) => s + p.x, 0) / bbox.length;
    const cy = bbox.reduce((s, p) => s + p.y, 0) / bbox.length;
    const height = Math.max(...bbox.map((p) => p.y)) - Math.min(...bbox.map((p) => p.y));
    return { detection: d, cx, cy, height };
  });

  withCenters.sort((a, b) => a.cy - b.cy);

  const avgHeight = withCenters.reduce((s, w) => s + w.height, 0) / withCenters.length;
  const lineThreshold = Math.max(avgHeight * 0.5, 10);

  const lines: (typeof withCenters)[] = [];
  let currentLine = [withCenters[0]];

  for (let i = 1; i < withCenters.length; i++) {
    if (Math.abs(withCenters[i].cy - currentLine[0].cy) <= lineThreshold) {
      currentLine.push(withCenters[i]);
    } else {
      lines.push(currentLine);
      currentLine = [withCenters[i]];
    }
  }
  lines.push(currentLine);

  return lines
    .map((line) => {
      line.sort((a, b) => a.cx - b.cx);
      return line.map((w) => w.detection.text).join("  ");
    })
    .join("\n");
}

export function useLabOcr() {
  const model = useOCR({ model: OCR_POLISH });
  const [state, setState] = useState<OcrPhase>({
    phase: "loading-model",
    downloadProgress: 0,
  });

  useEffect(() => {
    if (model.error) {
      setState({
        phase: "model-error",
        message: model.error.message ?? "Nie udało się załadować modelu OCR",
      });
    } else if (model.isReady) {
      setState((prev) =>
        prev.phase === "loading-model" || prev.phase === "model-error"
          ? { phase: "ready" }
          : prev
      );
    } else {
      setState((prev) =>
        prev.phase === "loading-model" || prev.phase === "model-error"
          ? {
              phase: "loading-model",
              downloadProgress: model.downloadProgress ?? 0,
            }
          : prev
      );
    }
  }, [model.isReady, model.error, model.downloadProgress]);

  const processImage = useCallback(
    async (imageUri: string) => {
      if (!model.isReady) return null;
      setState({ phase: "processing" });
      try {
        const detections = await model.forward(imageUri);
        console.log("[OCR] Detections count:", detections.length);
        detections.forEach((d, i) =>
          console.log(`[OCR] Detection ${i}: "${d.text}" (score: ${d.score.toFixed(2)})`)
        );
        const rawText = reconstructText(detections);
        console.log("[OCR] Reconstructed text:\n", rawText);
        if (!rawText.trim()) {
          setState({
            phase: "error",
            message: "Nie wykryto tekstu na zdjęciu. Spróbuj zrobić wyraźniejsze zdjęcie.",
          });
          return null;
        }
        setState({ phase: "done", rawText });
        return rawText;
      } catch (e: any) {
        setState({
          phase: "error",
          message:
            e.message ??
            "Nie udało się odczytać tekstu. Spróbuj zrobić wyraźniejsze zdjęcie.",
        });
        return null;
      }
    },
    [model]
  );

  const reset = useCallback(() => {
    if (model.isReady) {
      setState({ phase: "ready" });
    } else {
      setState({
        phase: "loading-model",
        downloadProgress: model.downloadProgress ?? 0,
      });
    }
  }, [model.isReady, model.downloadProgress]);

  return { state, processImage, reset, isModelReady: model.isReady };
}
