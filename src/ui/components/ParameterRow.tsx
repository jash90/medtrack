import { View, Text } from "react-native";
import type { ParameterStatus } from "../../types";
import { StatusBadge } from "./StatusBadge";

interface ParameterRowProps {
  name: string;
  value: number;
  unit: string;
  status: ParameterStatus;
  referenceMin?: number;
  referenceMax?: number;
}

export function ParameterRow({
  name,
  value,
  unit,
  status,
  referenceMin,
  referenceMax,
}: ParameterRowProps) {
  return (
    <View className="bg-white rounded-xl p-4 mb-2 border border-gray-100">
      <View className="flex-row justify-between items-start">
        <Text className="text-base font-medium text-gray-900 flex-1">
          {name}
        </Text>
        <StatusBadge status={status} />
      </View>
      <View className="flex-row items-baseline mt-2">
        <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        <Text className="text-sm text-gray-500 ml-1">{unit}</Text>
      </View>
      {(referenceMin !== undefined || referenceMax !== undefined) && (
        <Text className="text-xs text-gray-400 mt-1">
          Norma: {referenceMin ?? "–"} – {referenceMax ?? "–"} {unit}
        </Text>
      )}
    </View>
  );
}
