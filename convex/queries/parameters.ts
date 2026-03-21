import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const listByNameForTrends = query({
  args: {
    parameterName: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    return await ctx.db
      .query("parameters")
      .withIndex("by_user_name_date", (q) =>
        q.eq("userId", currentUser._id).eq("name", args.parameterName)
      )
      .order("asc")
      .collect();
  },
});

export const listDistinctNames = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    const allParams = await ctx.db
      .query("parameters")
      .withIndex("by_user_name_date", (q) =>
        q.eq("userId", currentUser._id)
      )
      .collect();

    const names = [...new Set(allParams.map((p) => p.name))];
    return names.sort();
  },
});

export const listParametersSummary = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    const allParams = await ctx.db
      .query("parameters")
      .withIndex("by_user_name_date", (q) =>
        q.eq("userId", currentUser._id)
      )
      .collect();

    const grouped = new Map<
      string,
      { value: number; unit: string; status: string; referenceMin?: number; referenceMax?: number; collectionDate: string }[]
    >();

    for (const p of allParams) {
      const existing = grouped.get(p.name);
      const entry = {
        value: p.value,
        unit: p.unit,
        status: p.status,
        referenceMin: p.referenceMin,
        referenceMax: p.referenceMax,
        collectionDate: p.collectionDate,
      };
      if (existing) {
        existing.push(entry);
      } else {
        grouped.set(p.name, [entry]);
      }
    }

    const summaries = Array.from(grouped.entries()).map(([name, entries]) => {
      // entries are sorted by collectionDate asc (index order)
      const latest = entries[entries.length - 1];
      const prev = entries.length >= 2 ? entries[entries.length - 2] : null;

      let trendDirection: "up" | "down" | "stable" | "unknown" = "unknown";
      if (prev) {
        if (latest.value > prev.value) trendDirection = "up";
        else if (latest.value < prev.value) trendDirection = "down";
        else trendDirection = "stable";
      }

      return {
        name,
        latestValue: latest.value,
        unit: latest.unit,
        status: latest.status,
        referenceMin: latest.referenceMin,
        referenceMax: latest.referenceMax,
        measurementCount: entries.length,
        trendDirection,
        latestDate: latest.collectionDate,
      };
    });

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  },
});
