import { View, Text, Pressable } from "react-native";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </Text>
      <Text className="text-gray-500 text-center mb-6">{description}</Text>
      {actionLabel && onAction && (
        <Pressable
          className="bg-primary-600 rounded-xl px-8 py-4"
          onPress={onAction}
        >
          <Text className="text-white font-semibold text-base">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
