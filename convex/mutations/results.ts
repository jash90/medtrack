import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";
import { hasPermission } from "../lib/permissions";

function computeStatus(
  value: number,
  referenceMin?: number,
  referenceMax?: number
): "normal" | "elevated" | "low" | "critical" {
  if (referenceMin === undefined && referenceMax === undefined) return "normal";

  if (referenceMax !== undefined && value > referenceMax) {
    const overshoot = (value - referenceMax) / referenceMax;
    return overshoot > 0.2 ? "critical" : "elevated";
  }

  if (referenceMin !== undefined && value < referenceMin) {
    const undershoot = (referenceMin - value) / referenceMin;
    return undershoot > 0.2 ? "critical" : "low";
  }

  return "normal";
}

export const saveScannedResult = mutation({
  args: {
    labName: v.string(),
    collectionDate: v.string(),
    notes: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    parameters: v.array(
      v.object({
        name: v.string(),
        value: v.number(),
        unit: v.string(),
        referenceMin: v.optional(v.number()),
        referenceMax: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const resultId = await ctx.db.insert("labResults", {
      userId: currentUser._id,
      uploadedBy: currentUser._id,
      uploadSource: "patient_scan",
      labName: args.labName,
      collectionDate: args.collectionDate,
      fileId: args.fileId,
      ocrStatus: "done",
      notes: args.notes,
    });

    for (const param of args.parameters) {
      const status = computeStatus(
        param.value,
        param.referenceMin,
        param.referenceMax
      );

      const parameterId = await ctx.db.insert("parameters", {
        resultId,
        userId: currentUser._id,
        name: param.name,
        value: param.value,
        unit: param.unit,
        referenceMin: param.referenceMin,
        referenceMax: param.referenceMax,
        status,
        collectionDate: args.collectionDate,
      });

      if (status !== "normal") {
        await ctx.db.insert("alerts", {
          userId: currentUser._id,
          parameterId,
          type: status === "critical" ? "critical" : "out_of_range",
          message: `${param.name}: ${param.value} ${param.unit} — ${status === "elevated" ? "powyżej normy" : status === "low" ? "poniżej normy" : "wartość krytyczna"}`,
          isRead: false,
        });
      }
    }

    return resultId;
  },
});

export const remove = mutation({
  args: {
    resultId: v.id("labResults"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const result = await ctx.db.get(args.resultId);
    if (!result) throw new Error("Result not found");

    const allowed = await hasPermission(
      ctx,
      "results:delete",
      result.userId
    );
    if (!allowed) throw new Error("Forbidden");

    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_result", (q) => q.eq("resultId", args.resultId))
      .collect();

    for (const param of parameters) {
      const alerts = await ctx.db
        .query("alerts")
        .filter((q) => q.eq(q.field("parameterId"), param._id))
        .collect();
      for (const alert of alerts) {
        await ctx.db.delete(alert._id);
      }
      await ctx.db.delete(param._id);
    }

    if (result.fileId) {
      await ctx.storage.delete(result.fileId);
    }

    await ctx.db.delete(args.resultId);
  },
});
