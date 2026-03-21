import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    medicalSegment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const updates = Object.fromEntries(
      Object.entries(args).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(currentUser._id, updates);
  },
});

export const deleteAccount = mutation({
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    // Cascade delete: results -> parameters -> alerts
    const results = await ctx.db
      .query("labResults")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    for (const result of results) {
      const params = await ctx.db
        .query("parameters")
        .withIndex("by_result", (q) => q.eq("resultId", result._id))
        .collect();

      for (const param of params) {
        const alerts = await ctx.db
          .query("alerts")
          .filter((q) => q.eq(q.field("parameterId"), param._id))
          .collect();
        for (const alert of alerts) await ctx.db.delete(alert._id);
        await ctx.db.delete(param._id);
      }

      await ctx.db.delete(result._id);
    }

    // Delete reminders
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();
    for (const r of reminders) await ctx.db.delete(r._id);

    // Delete sharing tokens
    const tokens = await ctx.db
      .query("sharingTokens")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();
    for (const t of tokens) await ctx.db.delete(t._id);

    // Delete user
    await ctx.db.delete(currentUser._id);
  },
});
