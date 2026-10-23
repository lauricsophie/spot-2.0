import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { config } from "./config.js";
import { processDocuments } from "./services/boamp/boamp-data-extractor";
import { processBoampEmbed } from "./services/boamp/boamp-embed-processor";
import { processDecp } from "./services/decp/decp-processor";
import { processBoampEstimate } from "./services/boamp/boamp-estimate-processor";

export const app = new Hono();

app.use("*", async (c, next) => {
  if (c.req.path === "/health") {
    return next();
  }
  const auth = bearerAuth({ token: config.API_TOKEN });
  return auth(c, next);
});

const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json({
        error: "Invalid request parameters",
        details: result.error.flatten().fieldErrors,
      }, 400);
    }
  });

const processRequestSchema = z.object({
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
  codeDepartement: z.string()
    .regex(/^\d{2,3}$/, "Code département invalide (2 ou 3 chiffres)")
    .optional().default('973'),
  boampId: z.string().optional(),
  rows: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/extract-from-boamp", validateJson(processRequestSchema), async (c) => {
  const result = await processDocuments(c.req.valid("json"));

  if (!result.success) {
    return c.json({ error: "Failed to process documents", details: result.error }, 502);
  }

  return c.json({
    success: true,
    totalCount: result.totalCount,
    processed: result.processed,
    results: result.results,
  });
});

const boampEmbedRequestSchema = z.object({
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
  codeDepartement: z.string()
    .regex(/^\d{2,3}$/, "Code département invalide (2 ou 3 chiffres)")
    .optional().default('973'),
  boampId: z.string().optional(),
  rows: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

app.post("/load-boamp", validateJson(boampEmbedRequestSchema), async (c) => {
  const result = await processBoampEmbed(c.req.valid("json"));

  if (!result.success) {
    return c.json(
      { error: "Failed to process BOAMP data", details: result.error },
      502
    );
  }

  return c.json({
    success: true,
    totalFetched: result.totalFetched,
    totalStored: result.totalStored,
    errors: result.errors,
  });
});

const boampEstimateSchema = z.object({
  boampId: z.string().min(1, "boampId est requis"),
  codeCpv: z.string().optional(),
});

app.post("/boamp-estimate", validateJson(boampEstimateSchema), async (c) => {
  const { boampId, codeCpv } = c.req.valid("json");
  const result = await processBoampEstimate(boampId, codeCpv);

  if (!result.success) {
    return c.json(
      { error: "Failed to estimate BOAMP", details: result.error },
      502
    );
  }

  return c.json({
    success: true,
    boampId: result.boampId,
    boampDescription: result.boampDescription,
    averageMontant: result.averageMontant,
    similarDecp: result.similarDecp,
  });
});

const decpRequestSchema = z.object({
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu: YYYY-MM-DD"),
});

app.post("/load-decp", validateJson(decpRequestSchema), async (c) => {
  const result = await processDecp(c.req.valid("json"));

  if (!result.success) {
    return c.json(
      { error: "Failed to process DECP data", details: result.error },
      502
    );
  }

  return c.json({
    success: true,
    totalFetched: result.totalFetched,
    totalGuyane: result.totalGuyane,
    totalStored: result.totalStored,
    errors: result.errors,
  });
});