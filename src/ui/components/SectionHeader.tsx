import { View, Text, Pressable } from "react-native";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View className="flex-row justify-between items-center mb-3">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text className="text-sm text-primary-600">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
