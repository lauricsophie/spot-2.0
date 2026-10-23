import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  API_TOKEN: z.string().min(1),
  DATABASE_URL: z.string(),
  BOAMP_ENDPOINT: z.string(),
  DECP_ENDPOINT: z.string(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MODEL_PROVIDER: z
    .enum(["mistral", "openai", "dev"])
    .default("mistral"),
  DEV_MODEL_NAME: z.string().optional().default(''),
  DEV_MODEL_ENDPOINT: z.string().optional().default(''),
  DEV_MODEL_ID: z.string().optional().default(''),
  DEV_MODEL_API_KEY: z.string().optional().default(''),
  MISTRAL_MODEL_ID: z.string().optional().default(''),
  MISTRAL_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL_ID: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  SSH_TUNNEL_HOST: z.string().optional().default(''),
  SSH_TUNNEL_USER: z.string().optional().default('root'),
  SSH_TUNNEL_KEY: z.string().optional().default(''),
  SSH_TUNNEL_PORT: z.coerce.number().optional().default(22),
  SSH_TUNNEL_FORWARD: z.string().optional().default('8000:localhost:8000'),
}).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.DEV_MODEL_NAME,
  { message: "DEV_MODEL_NAME is required when MODEL_PROVIDER is 'dev'", path: ["DEV_MODEL_NAME"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.DEV_MODEL_ENDPOINT,
  { message: "DEV_MODEL_ENDPOINT is required when MODEL_PROVIDER is 'dev'", path: ["DEV_MODEL_ENDPOINT"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.DEV_MODEL_ID,
  { message: "DEV_MODEL_ID is required when MODEL_PROVIDER is 'dev'", path: ["DEV_MODEL_ID"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.DEV_MODEL_API_KEY,
  { message: "DEV_MODEL_API_KEY is required when MODEL_PROVIDER is 'dev'", path: ["DEV_MODEL_API_KEY"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "mistral" || data.MISTRAL_MODEL_ID,
  { message: "MISTRAL_MODEL_ID is required when MODEL_PROVIDER is 'mistral'", path: ["MISTRAL_MODEL_ID"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "mistral" || data.MISTRAL_API_KEY,
  { message: "MISTRAL_API_KEY is required when MODEL_PROVIDER is 'mistral'", path: ["MISTRAL_API_KEY"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "openai" || data.OPENAI_MODEL_ID,
  { message: "OPENAI_MODEL_ID is required when MODEL_PROVIDER is 'openai'", path: ["OPENAI_MODEL_ID"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "openai" || data.OPENAI_API_KEY,
  { message: "OPENAI_API_KEY is required when MODEL_PROVIDER is 'openai'", path: ["OPENAI_API_KEY"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.SSH_TUNNEL_HOST,
  { message: "SSH_TUNNEL_HOST is required when MODEL_PROVIDER is 'dev'", path: ["SSH_TUNNEL_HOST"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.SSH_TUNNEL_USER,
  { message: "SSH_TUNNEL_USER is required when MODEL_PROVIDER is 'dev'", path: ["SSH_TUNNEL_USER"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || data.SSH_TUNNEL_KEY,
  { message: "SSH_TUNNEL_KEY is required when MODEL_PROVIDER is 'dev'", path: ["SSH_TUNNEL_KEY"] },
).refine(
  (data) => data.MODEL_PROVIDER !== "dev" || /^\d+:[^:]+:\d+$/.test(data.SSH_TUNNEL_FORWARD),
  { message: "SSH_TUNNEL_FORWARD must be 'localPort:remoteHost:remotePort' when MODEL_PROVIDER is 'dev'", path: ["SSH_TUNNEL_FORWARD"] },
);

export const MISTRAL_EMBED_MODEL = "mistral-embed";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
