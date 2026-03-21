import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const create = mutation({
  args: {
    title: v.string(),
    examType: v.string(),
    scheduledAt: v.number(),
    repeatIntervalDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    return await ctx.db.insert("reminders", {
      userId: currentUser._id,
      createdBy: currentUser._id,
      title: args.title,
      examType: args.examType,
      scheduledAt: args.scheduledAt,
      repeatIntervalDays: args.repeatIntervalDays,
      isActive: true,
      pushSent: false,
    });
  },
});

export const update = mutation({
  args: {
    reminderId: v.id("reminders"),
    title: v.optional(v.string()),
    examType: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    repeatIntervalDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== currentUser._id) {
      throw new Error("Forbidden");
    }

    const { reminderId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(reminderId, filtered);
  },
});

export const remove = mutation({
  args: {
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== currentUser._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.reminderId);
  },
});
