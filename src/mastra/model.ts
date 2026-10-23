import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { config } from "../config.js";

const mistral = createMistral({
  apiKey: config.MISTRAL_API_KEY,
});

const openai = createOpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const devProvider = createOpenAICompatible({
  name: config.DEV_MODEL_NAME,
  baseURL: config.DEV_MODEL_ENDPOINT,
  apiKey: config.DEV_MODEL_API_KEY,
  fetch: async (url, options) => {
    const body = JSON.parse(options!.body as string);
    body.chat_template_kwargs = { enable_thinking: false };
    return fetch(url, { ...options, body: JSON.stringify(body) });
  },
});

export const model =
  config.MODEL_PROVIDER === "dev"
    ? devProvider(config.DEV_MODEL_ID)
    : config.MODEL_PROVIDER === "openai"
      ? openai(config.OPENAI_MODEL_ID)
      : mistral(config.MISTRAL_MODEL_ID);