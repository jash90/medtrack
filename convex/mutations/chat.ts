import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const saveMessages = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.string(),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "user",
      content: args.userMessage,
    });
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "assistant",
      content: args.assistantMessage,
    });
  },
});
