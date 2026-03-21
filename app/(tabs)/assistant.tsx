import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";

function generateId(): string {
  return (
    Math.random().toString(36).substring(2) +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2)
  );
}

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AssistantScreen() {
  const [conversationId] = useState(() => generateId());
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const serverMessages = useQuery(api.queries.chat.listForUser, {
    conversationId,
    limit: 50,
  });

  const chatAction = useAction(api.actions.medicalAgent.chat);

  // Sync server messages to local state
  useEffect(() => {
    if (serverMessages && serverMessages.length > 0) {
      setLocalMessages(
        serverMessages.map((m) => ({
          _id: m._id,
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [serverMessages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Optimistic update — add user message
    const tempUserMsg: Message = {
      _id: `temp-user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setLocalMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await chatAction({
        conversationId,
        message: text,
      });

      // Add assistant response (server will also save, useQuery will sync)
      const tempAssistantMsg: Message = {
        _id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: result.content,
      };
      setLocalMessages((prev) => [...prev, tempAssistantMsg]);
    } catch (e: any) {
      const errorMsg: Message = {
        _id: `temp-error-${Date.now()}`,
        role: "assistant",
        content: `Wystapil blad: ${e.message ?? "Sprobuj ponownie."}`,
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId, chatAction]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        className={`mb-3 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
      >
        <View
          className={`rounded-2xl px-4 py-3 ${
            isUser ? "bg-primary-600 rounded-br-md" : "bg-white border border-gray-200 rounded-bl-md"
          }`}
        >
          <Text
            className={`text-base leading-6 ${
              isUser ? "text-white" : "text-gray-900"
            }`}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {localMessages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🩺</Text>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Asystent MedTrack
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            Zapytaj mnie o swoje wyniki badań, trendy parametrów, alerty lub
            nadchodzące badania.
          </Text>
          <View className="mt-6 gap-2">
            {[
              "Jakie mam ostatnie wyniki?",
              "Czy mam jakieś nieprawidłowe wartości?",
              "Pokaż trend hemoglobiny",
            ].map((suggestion) => (
              <Pressable
                key={suggestion}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 active:bg-gray-100"
                onPress={() => {
                  setInput(suggestion);
                }}
              >
                <Text className="text-sm text-gray-700">{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={localMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {isLoading && (
        <View className="flex-row items-center px-5 pb-2 gap-2">
          <ActivityIndicator size="small" color="#2563EB" />
          <Text className="text-sm text-gray-500">Analizuję...</Text>
        </View>
      )}

      <View className="flex-row items-end px-4 pb-4 pt-2 bg-white border-t border-gray-100 gap-2">
        <TextInput
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base text-gray-900 max-h-24"
          placeholder="Zadaj pytanie o swoje wyniki..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isLoading}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <Pressable
          className={`rounded-full w-11 h-11 items-center justify-center ${
            input.trim() && !isLoading
              ? "bg-primary-600 active:bg-primary-700"
              : "bg-gray-200"
          }`}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Text className="text-white text-lg font-bold">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
