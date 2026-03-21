import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function RemindersScreen() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showAdd, setShowAdd] = useState(false);

  const upcoming = useQuery(api.queries.reminders.listUpcoming, {});
  const past = useQuery(api.queries.reminders.listPast);
  const createReminder = useMutation(api.mutations.reminders.create);
  const removeReminder = useMutation(api.mutations.reminders.remove);

  const data = tab === "upcoming" ? upcoming : past;

  function handleDelete(id: Id<"reminders">) {
    Alert.alert("Usuń przypomnienie", "Na pewno?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: () => removeReminder({ reminderId: id }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Przypomnienia" }} />
      <View className="flex-1 bg-gray-50">
        {/* Tabs */}
        <View className="flex-row px-5 pt-4 mb-4">
          <Pressable
            className={`flex-1 py-2 items-center rounded-lg mr-1 ${
              tab === "upcoming" ? "bg-primary-600" : "bg-gray-200"
            }`}
            onPress={() => setTab("upcoming")}
          >
            <Text
              className={`font-medium ${
                tab === "upcoming" ? "text-white" : "text-gray-600"
              }`}
            >
              Nadchodzące
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-2 items-center rounded-lg ml-1 ${
              tab === "past" ? "bg-primary-600" : "bg-gray-200"
            }`}
            onPress={() => setTab("past")}
          >
            <Text
              className={`font-medium ${
                tab === "past" ? "text-white" : "text-gray-600"
              }`}
            >
              Przeszłe
            </Text>
          </Pressable>
        </View>

        {data && data.length > 0 ? (
          <FlatList
            data={data}
            contentContainerClassName="px-5 pb-24"
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <Pressable
                className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
                onLongPress={() => handleDelete(item._id)}
              >
                <Text className="text-base font-medium text-gray-900">
                  {item.title}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {item.examType} •{" "}
                  {new Date(item.scheduledAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                {item.repeatIntervalDays && (
                  <Text className="text-xs text-primary-600 mt-1">
                    Powtarzaj co {item.repeatIntervalDays} dni
                  </Text>
                )}
              </Pressable>
            )}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-400 text-center">
              {tab === "upcoming"
                ? "Brak zaplanowanych badań"
                : "Brak przeszłych przypomnień"}
            </Text>
          </View>
        )}

        {/* FAB */}
        <Pressable
          className="absolute bottom-6 right-6 bg-primary-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => setShowAdd(true)}
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </Pressable>

        {/* Add Modal */}
        <AddReminderModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onCreate={async (data) => {
            await createReminder(data);
            setShowAdd(false);
          }}
        />
      </View>
    </>
  );
}

function AddReminderModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    examType: string;
    scheduledAt: number;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [date, setDate] = useState("");

  async function handleSave() {
    if (!title || !examType || !date) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    const scheduledAt = new Date(date).getTime();
    if (isNaN(scheduledAt)) {
      Alert.alert("Błąd", "Nieprawidłowa data (format: RRRR-MM-DD)");
      return;
    }

    await onCreate({ title, examType, scheduledAt });
    setTitle("");
    setExamType("");
    setDate("");
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end">
        <View className="bg-white rounded-t-3xl px-5 pt-6 pb-10 shadow-xl">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Nowe przypomnienie
          </Text>

          <Text className="text-sm font-medium text-gray-700 mb-1">Tytuł</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
            placeholder="np. Morfologia krwi"
            value={title}
            onChangeText={setTitle}
          />

          <Text className="text-sm font-medium text-gray-700 mb-1">
            Typ badania
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
            placeholder="np. Krew, Mocz, Hormonalne"
            value={examType}
            onChangeText={setExamType}
          />

          <Text className="text-sm font-medium text-gray-700 mb-1">Data</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
            placeholder="RRRR-MM-DD"
            value={date}
            onChangeText={setDate}
          />

          <Pressable
            className="bg-primary-600 rounded-xl py-4 items-center mb-3"
            onPress={handleSave}
          >
            <Text className="text-white font-semibold">Zapisz</Text>
          </Pressable>

          <Pressable
            className="rounded-xl py-3 items-center"
            onPress={onClose}
          >
            <Text className="text-gray-500">Anuluj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
