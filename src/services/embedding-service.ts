import { embedMany } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { config, MISTRAL_EMBED_MODEL } from "../config.js";
import { withRetry } from "../lib/retry.js";
import { logger } from "../lib/logger.js";

const mistral = createMistral({
  apiKey: config.MISTRAL_API_KEY,
});

const BATCH_SIZE = 50;

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  logger.info({ count: texts.length }, "Generating embeddings");

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const result = await withRetry(
      async () => {
        const { embeddings } = await embedMany({
          model: mistral.embedding(MISTRAL_EMBED_MODEL),
          values: batch,
        });
        return embeddings;
      },
      `embed:batch:${i}-${i + batch.length}`
    );

    allEmbeddings.push(...result);

    logger.debug(
      { batchIndex: Math.floor(i / BATCH_SIZE), batchSize: batch.length },
      "Embedding batch completed"
    );
  }

  return allEmbeddings;
}
