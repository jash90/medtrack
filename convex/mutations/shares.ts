import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const createToken = mutation({
  args: {
    doctorEmail: v.optional(v.string()),
    accessLevel: v.union(v.literal("full"), v.literal("filtered")),
    parameterFilter: v.optional(v.array(v.string())),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const expiresInDays = args.expiresInDays ?? 7;

    const token =
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);

    await ctx.db.insert("sharingTokens", {
      userId: currentUser._id,
      token,
      doctorEmail: args.doctorEmail,
      accessLevel: args.accessLevel,
      parameterFilter: args.parameterFilter,
      expiresAt: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      viewCount: 0,
    });

    return token;
  },
});

export const revokeToken = mutation({
  args: {
    tokenId: v.id("sharingTokens"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const share = await ctx.db.get(args.tokenId);
    if (!share || share.userId !== currentUser._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.tokenId);
  },
});
