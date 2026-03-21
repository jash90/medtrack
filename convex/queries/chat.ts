import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const listMessages = internalQuery({
  args: {
    userId: v.id("users"),
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user_conversationId", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(limit);
  },
});

export const listForUser = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user_conversationId", (q) =>
        q
          .eq("userId", currentUser._id)
          .eq("conversationId", args.conversationId)
      )
      .order("asc")
      .take(limit);
  },
});
