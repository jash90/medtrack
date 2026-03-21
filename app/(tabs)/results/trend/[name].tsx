import { View, Text, ScrollView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocalSearchParams } from "expo-router";
import { StatusBadge } from "@/src/ui/components/StatusBadge";
import { TrendChart } from "@/src/ui/components/TrendChart";
import type { ParameterStatus } from "@/src/types";

const statusColors: Record<string, string> = {
  normal: "bg-green-50 border-green-200",
  elevated: "bg-amber-50 border-amber-200",
  low: "bg-indigo-50 border-indigo-200",
  critical: "bg-red-50 border-red-200",
};

const trendLabels: Record<string, string> = {
  up: "Rosnący",
  down: "Malejący",
  stable: "Stabilny",
  unknown: "Brak danych",
};

const trendArrows: Record<string, { symbol: string; color: string }> = {
  up: { symbol: "↑", color: "text-red-500" },
  down: { symbol: "↓", color: "text-indigo-500" },
  stable: { symbol: "→", color: "text-green-500" },
  unknown: { symbol: "–", color: "text-gray-400" },
};

export default function TrendDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const trendData = useQuery(api.queries.parameters.listByNameForTrends, {
    parameterName: name!,
  });

  if (!trendData) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  const latest = trendData[trendData.length - 1];
  const prev = trendData.length >= 2 ? trendData[trendData.length - 2] : null;

  let trendDirection: "up" | "down" | "stable" | "unknown" = "unknown";
  if (prev) {
    if (latest.value > prev.value) trendDirection = "up";
    else if (latest.value < prev.value) trendDirection = "down";
    else trendDirection = "stable";
  }

  const trend = trendArrows[trendDirection];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-8">
        {/* Header card */}
        <View className="bg-white rounded-xl p-5 border border-gray-100 mb-4">
          <Text className="text-lg font-semibold text-gray-900">{name}</Text>

          <View className="flex-row items-baseline mt-2">
            <Text className="text-3xl font-bold text-gray-900">
              {latest.value}
            </Text>
            <Text className="text-base text-gray-500 ml-1.5">
              {latest.unit}
            </Text>
            <Text className={`text-xl font-bold ml-3 ${trend.color}`}>
              {trend.symbol}
            </Text>
          </View>

          <View className="flex-row items-center mt-3 gap-3">
            <StatusBadge status={latest.status as ParameterStatus} />
            <Text className="text-sm text-gray-500">
              Trend: {trendLabels[trendDirection]}
            </Text>
          </View>

          {(latest.referenceMin !== undefined ||
            latest.referenceMax !== undefined) && (
            <Text className="text-xs text-gray-400 mt-2">
              Norma: {latest.referenceMin ?? "–"} – {latest.referenceMax ?? "–"}{" "}
              {latest.unit}
            </Text>
          )}
        </View>

        {/* Chart */}
        <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            Wykres trendu
          </Text>
          <TrendChart parameterName={name!} />
        </View>

        {/* History */}
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-base font-semibold text-gray-900">
              Historia pomiarów ({trendData.length})
            </Text>
          </View>

          {[...trendData].reverse().map((point, index) => {
            const style = statusColors[point.status] ?? "";
            return (
              <View
                key={`${point.collectionDate}-${index}`}
                className={`flex-row justify-between items-center px-4 py-3 ${
                  index < trendData.length - 1
                    ? "border-b border-gray-50"
                    : ""
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">
                    {point.collectionDate}
                  </Text>
                </View>

                <View className="flex-row items-baseline mr-3">
                  <Text className="text-lg font-bold text-gray-900">
                    {point.value}
                  </Text>
                  <Text className="text-xs text-gray-400 ml-1">
                    {point.unit}
                  </Text>
                </View>

                <View
                  className={`px-2.5 py-0.5 rounded-full border ${style}`}
                >
                  <StatusBadge status={point.status as ParameterStatus} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
