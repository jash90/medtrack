import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLabOcr } from "@/lib/use-lab-ocr";
import { useRodoRedactor } from "@/lib/use-rodo-redactor";
import { useOcrResult } from "@/lib/ocr-result-context";
import { useState } from "react";

export default function ScanScreen() {
  const router = useRouter();
  const { state: ocrState, processImage, reset: resetOcr } = useLabOcr();
  const { redact, isReady: isRedactorReady, downloadProgress: redactorProgress, error: redactorError } = useRodoRedactor();
  const { setParsedResult } = useOcrResult();
  const parseWithAI = useAction(api.actions.parseWithAI.parseOcrText);
  const [processingStep, setProcessingStep] = useState<
    null | "ocr" | "rodo" | "ai"
  >(null);

  const modelsReady = ocrState.phase === "ready" && isRedactorReady;

  async function pickImage(source: "camera" | "gallery") {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Brak uprawnień", "Zezwól na dostęp do aparatu w ustawieniach");
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Brak uprawnień", "Zezwól na dostęp do galerii w ustawieniach");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const imageUri = result.assets[0].uri;

    try {
      // Step 1: On-device OCR
      setProcessingStep("ocr");
      const rawText = await processImage(imageUri);
      if (!rawText) {
        setProcessingStep(null);
        return;
      }
      console.log("[OCR] Raw text:", rawText);

      // Step 2: On-device RODO redaction
      setProcessingStep("rodo");
      const redactedText = await redact(rawText);
      console.log("[RODO] Redacted text:", redactedText);

      // Step 3: Cloud AI parsing
      setProcessingStep("ai");
      const parsed = await parseWithAI({ rawText: redactedText });
      console.log("[GLM] Parsed result:", JSON.stringify(parsed, null, 2));

      setParsedResult(
        {
          labName: parsed.labName,
          collectionDate: parsed.collectionDate,
          parameters: parsed.parameters,
          rawText: redactedText,
        },
        imageUri
      );
      resetOcr();
      router.push("/add-result/review");
    } catch (e: any) {
      Alert.alert(
        "Błąd analizy",
        e.message ?? "Nie udało się przeanalizować wyników. Spróbuj ponownie."
      );
      resetOcr();
    } finally {
      setProcessingStep(null);
    }
  }

  // Models loading
  if (ocrState.phase === "loading-model" || !isRedactorReady) {
    const ocrLoading = ocrState.phase === "loading-model";
    const progress = ocrLoading
      ? (ocrState as any).downloadProgress ?? 0
      : redactorProgress ?? 0;
    const label = ocrLoading
      ? (ocrState as any).downloadProgress >= 1
        ? "Inicjalizacja modelu OCR..."
        : "Pobieranie modelu OCR..."
      : (redactorProgress ?? 0) >= 1
        ? "Inicjalizacja modelu anonimizacji..."
        : "Pobieranie modelu anonimizacji...";

    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-lg font-semibold text-gray-900 mt-6">
          {label}
        </Text>
        <Text className="text-sm text-gray-500 mt-2 text-center">
          Jednorazowe pobieranie
        </Text>
        <View className="w-full h-2 bg-gray-200 rounded-full mt-4">
          <View
            className="h-2 bg-primary-600 rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
        <Text className="text-xs text-gray-400 mt-2">
          {Math.round(progress * 100)}%
        </Text>
      </View>
    );
  }

  // Model error
  if (ocrState.phase === "model-error") {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Text className="text-5xl mb-4">😕</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Nie udało się załadować modelu
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          {(ocrState as any).message}
        </Text>
        <Pressable className="bg-primary-600 rounded-xl px-8 py-4" onPress={resetOcr}>
          <Text className="text-white font-semibold text-base">Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  // Redactor model error
  if (redactorError) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Text className="text-5xl mb-4">😕</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Nie udało się załadować modelu anonimizacji
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          {redactorError.message ?? "Nieznany błąd"}
        </Text>
      </View>
    );
  }

  // Processing steps
  if (processingStep) {
    const steps = {
      ocr: { title: "Odczytywanie tekstu...", desc: "OCR rozpoznaje tekst z dokumentu" },
      rodo: { title: "Anonimizacja danych...", desc: "Lokalne AI usuwa dane osobowe (RODO)" },
      ai: { title: "Analiza wyników...", desc: "GLM wyodrębnia parametry badań" },
    };
    const step = steps[processingStep];

    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-lg font-semibold text-gray-900 mt-6">{step.title}</Text>
        <Text className="text-sm text-gray-500 mt-2 text-center">{step.desc}</Text>
      </View>
    );
  }

  // OCR error
  if (ocrState.phase === "error") {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Text className="text-5xl mb-4">😕</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Nie udało się odczytać
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          {(ocrState as any).message}
        </Text>
        <Pressable className="bg-primary-600 rounded-xl px-8 py-4" onPress={resetOcr}>
          <Text className="text-white font-semibold text-base">Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  // Ready
  return (
    <View className="flex-1 bg-gray-50 px-5 pt-8">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Dodaj wynik badania
      </Text>
      <Text className="text-base text-gray-500 mb-8">
        Zrób zdjęcie lub wybierz plik z wynikami badań.{"\n"}
        AI automatycznie rozpozna parametry.
      </Text>

      <Pressable
        className="bg-primary-600 rounded-2xl p-6 mb-4 active:bg-primary-700"
        onPress={() => pickImage("camera")}
        disabled={!modelsReady}
      >
        <Text className="text-xl font-semibold text-white mb-1">Zrób zdjęcie</Text>
        <Text className="text-sm text-primary-100">
          Sfotografuj dokument z wynikami badań laboratoryjnych
        </Text>
      </Pressable>

      <Pressable
        className="bg-white rounded-2xl p-6 border-2 border-primary-200 active:bg-primary-50"
        onPress={() => pickImage("gallery")}
        disabled={!modelsReady}
      >
        <Text className="text-xl font-semibold text-gray-900 mb-1">Wybierz z galerii</Text>
        <Text className="text-sm text-gray-500">
          Wybierz zdjęcie wyników, które już masz w telefonie
        </Text>
      </Pressable>

      <View className="mt-8 px-2">
        <Text className="text-xs text-gray-400 text-center leading-5">
          OCR na urządzeniu + anonimizacja RODO + analiza AI.{"\n"}
          Dane osobowe nigdy nie opuszczają Twojego telefonu.
        </Text>
      </View>
    </View>
  );
}
