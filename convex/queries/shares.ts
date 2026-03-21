import { query } from "../_generated/server";
import { v } from "convex/values";

export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("sharingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!share) return null;
    if (share.expiresAt < Date.now()) return { expired: true };

    const user = await ctx.db.get(share.userId);

    const results = await ctx.db
      .query("labResults")
      .withIndex("by_user", (q) => q.eq("userId", share.userId))
      .order("desc")
      .collect();

    const resultsWithParams = await Promise.all(
      results.map(async (result) => {
        let params = await ctx.db
          .query("parameters")
          .withIndex("by_result", (q) => q.eq("resultId", result._id))
          .collect();

        if (share.accessLevel === "filtered" && share.parameterFilter) {
          params = params.filter((p) =>
            share.parameterFilter!.includes(p.name)
          );
        }

        return { ...result, parameters: params };
      })
    );

    return {
      expired: false,
      patientName: user?.name ?? "Pacjent",
      accessLevel: share.accessLevel,
      results: resultsWithParams,
    };
  },
});
