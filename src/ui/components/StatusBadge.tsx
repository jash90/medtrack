import { View, Text } from "react-native";
import type { ParameterStatus } from "../../types";

const styles: Record<
  ParameterStatus,
  { bg: string; text: string; label: string }
> = {
  normal: { bg: "bg-green-100", text: "text-green-700", label: "Norma" },
  elevated: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Podwyższony",
  },
  low: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Obniżony" },
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Krytyczny" },
};

interface StatusBadgeProps {
  status: ParameterStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status];
  return (
    <View className={`px-3 py-1 rounded-full ${style.bg}`}>
      <Text className={`text-xs font-medium ${style.text}`}>{style.label}</Text>
    </View>
  );
}
