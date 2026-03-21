import { View, Text, Dimensions } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { LineChart } from "react-native-gifted-charts";

const screenWidth = Dimensions.get("window").width;

const statusDotColors: Record<string, string> = {
  normal: "#22C55E",
  elevated: "#F59E0B",
  low: "#6366F1",
  critical: "#EF4444",
};

interface TrendChartProps {
  parameterName: string;
}

export function TrendChart({ parameterName }: TrendChartProps) {
  const trendData = useQuery(api.queries.parameters.listByNameForTrends, {
    parameterName,
  });

  if (!trendData) {
    return (
      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">Ładowanie wykresu...</Text>
      </View>
    );
  }

  if (trendData.length < 2) {
    return (
      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">
          Za mało danych do wyświetlenia trendu (min. 2 pomiary)
        </Text>
      </View>
    );
  }

  const referenceMin = trendData[trendData.length - 1].referenceMin;
  const referenceMax = trendData[trendData.length - 1].referenceMax;
  const unit = trendData[trendData.length - 1].unit;

  const lineData = trendData.map((point) => {
    const dateStr = point.collectionDate;
    const parts = dateStr.split("-");
    const label =
      parts.length >= 3 ? `${parts[2]}.${parts[1]}` : dateStr.slice(-5);

    return {
      value: point.value,
      label,
      dataPointColor: statusDotColors[point.status] ?? "#6B7280",
      customDataPoint: () => (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusDotColors[point.status] ?? "#6B7280",
          }}
        />
      ),
    };
  });

  const allValues = trendData.map((p) => p.value);
  const minVal = Math.min(
    ...allValues,
    referenceMin ?? Infinity
  );
  const maxVal = Math.max(
    ...allValues,
    referenceMax ?? -Infinity
  );
  const padding = (maxVal - minVal) * 0.15 || 1;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  const chartWidth = Math.max(screenWidth - 80, lineData.length * 60);

  return (
    <View className="mt-3">
      <View className="bg-gray-50 rounded-xl p-3 overflow-hidden">
        <LineChart
          data={lineData}
          width={chartWidth}
          height={180}
          color="#2563EB"
          thickness={2}
          dataPointsRadius={4}
          dataPointsColor="#2563EB"
          yAxisOffset={yMin}
          maxValue={yMax - yMin}
          noOfSections={4}
          yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}
          xAxisLabelTextStyle={{
            color: "#9CA3AF",
            fontSize: 9,
            width: 40,
            textAlign: "center",
          }}
          spacing={60}
          initialSpacing={20}
          endSpacing={20}
          rulesColor="#E5E7EB"
          rulesType="dashed"
          yAxisColor="#E5E7EB"
          xAxisColor="#E5E7EB"
          hideDataPoints={false}
          curved
          isAnimated
          animationDuration={600}
          formatYLabel={(val: string) => {
            const num = parseFloat(val) + yMin;
            return Number.isInteger(num) ? String(num) : num.toFixed(1);
          }}
          {...(referenceMin !== undefined
            ? {
                referenceLine1Position: referenceMin - yMin,
                referenceLine1Config: {
                  color: "#BBF7D0",
                  dashWidth: 6,
                  dashGap: 4,
                  thickness: 1,
                },
              }
            : {})}
          {...(referenceMax !== undefined
            ? {
                referenceLine2Position: referenceMax - yMin,
                referenceLine2Config: {
                  color: "#BBF7D0",
                  dashWidth: 6,
                  dashGap: 4,
                  thickness: 1,
                },
              }
            : {})}
        />
      </View>

      {/* Legend */}
      {(referenceMin !== undefined || referenceMax !== undefined) && (
        <View className="flex-row items-center mt-2 px-1">
          <View className="w-3 h-0.5 bg-green-300 mr-1.5" />
          <Text className="text-xs text-gray-400">
            Norma: {referenceMin ?? "–"} – {referenceMax ?? "–"} {unit}
          </Text>
        </View>
      )}
    </View>
  );
}
