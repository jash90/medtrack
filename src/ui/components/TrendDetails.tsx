import { View, Text, Pressable, FlatList } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "expo-router";
import { StatusBadge } from "./StatusBadge";
import type { ParameterStatus } from "../../types";

const trendArrows: Record<string, { symbol: string; color: string }> = {
  up: { symbol: "↑", color: "text-red-500" },
  down: { symbol: "↓", color: "text-indigo-500" },
  stable: { symbol: "→", color: "text-green-500" },
  unknown: { symbol: "–", color: "text-gray-400" },
};

export function TrendDetails() {
  const router = useRouter();
  const summaries = useQuery(api.queries.parameters.listParametersSummary);

  if (!summaries) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-gray-400">Ładowanie trendów...</Text>
      </View>
    );
  }

  if (summaries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-8">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          Brak danych o trendach
        </Text>
        <Text className="text-gray-500 text-center">
          Dodaj wyniki badań, aby śledzić trendy parametrów
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={summaries}
      contentContainerClassName="px-5 pt-4 pb-24"
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => {
        const trend = trendArrows[item.trendDirection];

        return (
          <Pressable
            className="bg-white rounded-xl mb-3 border border-gray-100 overflow-hidden"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/results/trend/[name]",
                params: { name: item.name },
              })
            }
          >
            <View className="p-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {item.name}
                  </Text>
                  <View className="flex-row items-baseline mt-1.5">
                    <Text className="text-2xl font-bold text-gray-900">
                      {item.latestValue}
                    </Text>
                    <Text className="text-sm text-gray-500 ml-1">
                      {item.unit}
                    </Text>
                    <Text className={`text-lg font-bold ml-2 ${trend.color}`}>
                      {trend.symbol}
                    </Text>
                  </View>
                </View>

                <View className="items-end gap-1.5">
                  <StatusBadge status={item.status as ParameterStatus} />
                  <Text className="text-xs text-gray-400">
                    {item.measurementCount}{" "}
                    {item.measurementCount === 1
                      ? "pomiar"
                      : item.measurementCount < 5
                        ? "pomiary"
                        : "pomiarów"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row justify-between items-center px-4 pb-3 border-t border-gray-50 pt-2.5">
              <Text className="text-xs text-gray-400">
                Ostatni: {item.latestDate}
              </Text>
              <Text className="text-xs text-primary-600 font-medium">
                Zobacz szczegóły →
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
