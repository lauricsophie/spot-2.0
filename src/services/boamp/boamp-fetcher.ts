import { z } from "zod";
import { withRetry } from "../../lib/retry";

export const FetchParamsSchema = z.object({
  endpoint: z.url(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type FetchParams = z.infer<typeof FetchParamsSchema>;

export interface FetchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchOnce<T>(params: FetchParams): Promise<T> {
  const response = await fetch(params.endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...params.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchDocuments<T = unknown>(
  params: FetchParams
): Promise<FetchResult<T>> {
  try {
    const data = await withRetry(
      () => fetchOnce<T>(params),
      `fetch:${params.endpoint}`
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
