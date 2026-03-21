import { View, Text, Pressable } from "react-native";

interface ResultCardProps {
  labName: string;
  collectionDate: string;
  notes?: string;
  variant?: "compact" | "full";
  onPress?: () => void;
}

export function ResultCard({
  labName,
  collectionDate,
  notes,
  variant = "full",
  onPress,
}: ResultCardProps) {
  return (
    <Pressable
      className={`bg-white rounded-xl border border-gray-100 ${
        variant === "compact" ? "p-3 mr-3 w-48" : "p-4 mb-3"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-semibold text-gray-900 ${
          variant === "compact" ? "text-sm" : "text-base"
        }`}
        numberOfLines={1}
      >
        {labName}
      </Text>
      <Text className="text-sm text-gray-500 mt-1">{collectionDate}</Text>
      {variant === "full" && notes && (
        <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>
          {notes}
        </Text>
      )}
    </Pressable>
  );
}
