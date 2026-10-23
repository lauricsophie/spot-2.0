import { logger } from "../../lib/logger";
import { fetchDocuments } from "./boamp-fetcher";
import { boampDescriptionAgent } from "../../mastra/agents/boamp-description-agent";
import { generateEmbeddings } from "../embedding-service";
import { upsertBoampVectorRecords, type BoampVectorRecord } from "../vector-store";
import { buildEndpointUrl, parseJsonFields, type BoampQueryParams, type BoampResponse } from "./boamp-common";
import type { BoampAnnonce } from "../../types/boamp.type";

export interface BoampEmbedResult {
  success: boolean;
  totalFetched: number;
  totalStored: number;
  errors: number;
  error?: string;
}

function extractMontant(record: BoampAnnonce): number | null {
  const donnees = record.donnees as unknown as Record<string, unknown> | null;
  if (!donnees) return null;

  // Try common paths for montant in BOAMP donnees
  const paths = [
    ["CONDITION_ADMINISTRATIVE", "MONTANT"],
    ["CONDITION_ADMINISTRATIVE", "VALEUR_ESTIMEE", "MONTANT"],
    ["OBJET", "MONTANT"],
    ["ATTRIBUTION", "DECISION", "MONTANT"],
  ];

  for (const path of paths) {
    let value: unknown = donnees;
    for (const key of path) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

async function generateDescription(record: BoampAnnonce): Promise<string> {
  const response = await boampDescriptionAgent.generate(
    `Voici un enregistrement BOAMP au format JSON. Rédige une description textuelle synthétique de ce marché.\n\n${JSON.stringify(record)}`,
  );
  return response.text.trim();
}

async function generateDescriptions(
  records: BoampAnnonce[],
): Promise<string[]> {
  const descriptions: string[] = [];

  for (let i = 0; i < records.length; i++) {
    try {
      const description = await generateDescription(records[i]);
      descriptions.push(description);
      logger.debug(
        { index: i, boampIdWeb: records[i].idweb },
        "BOAMP description generated",
      );
    } catch (error) {
      logger.error(
        { index: i, boampIdWeb: records[i].idweb, error },
        "Failed to generate BOAMP description, using fallback",
      );
      const fallback = [records[i].objet, records[i].nomacheteur]
        .filter(Boolean)
        .join(" | ");
      descriptions.push(fallback || "N/A");
    }
  }

  return descriptions;
}

async function fetchAndProcessPage(
  params: BoampQueryParams,
): Promise<{ records: BoampAnnonce[]; totalCount: number } | { error: string }> {
  const endpoint = buildEndpointUrl(params);
  logger.info({ endpoint, offset: params.offset, rows: params.rows }, "Fetching BOAMP page");

  const fetchResult = await fetchDocuments<BoampResponse>({ endpoint });

  if (!fetchResult.success || !fetchResult.data) {
    return { error: fetchResult.error ?? "Unknown fetch error" };
  }

  const data = parseJsonFields(fetchResult.data);
  return { records: data.results, totalCount: data.total_count };
}

async function processPage(
  params: BoampQueryParams,
  records: BoampAnnonce[],
): Promise<{ stored: number; errors: number }> {
  const descriptions = await generateDescriptions(records);
  const embeddings = await generateEmbeddings(descriptions);

  const vectorRecords: BoampVectorRecord[] = records.map((record, i) => ({
    boampIdWeb: record.idweb,
    description: descriptions[i],
    montant: extractMontant(record),
    embedding: embeddings[i],
    metadata: {
      dateDebut: params.dateDebut,
      dateFin: params.dateFin,
      codeDepartement: params.codeDepartement,
      processedAt: new Date().toISOString(),
    },
  }));

  const storeResult = await upsertBoampVectorRecords(vectorRecords);
  return {
    stored: storeResult.inserted + storeResult.updated,
    errors: storeResult.errors,
  };
}

export async function processBoampEmbed(
  params: BoampQueryParams,
): Promise<BoampEmbedResult> {
  const singlePage = params.rows != null && params.offset != null;
  const pageSize = params.rows ?? 20;
  let offset = params.offset ?? 0;
  let totalFetched = 0;
  let totalStored = 0;
  let totalErrors = 0;

  logger.info({ params, mode: singlePage ? "single-page" : "paginate-all" }, "Starting BOAMP embed processing");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageParams: BoampQueryParams = { ...params, rows: pageSize, offset };
    const pageResult = await fetchAndProcessPage(pageParams);

    if ("error" in pageResult) {
      logger.error({ error: pageResult.error, offset }, "Failed to fetch BOAMP page");
      return {
        success: false,
        totalFetched,
        totalStored,
        errors: totalErrors,
        error: pageResult.error,
      };
    }

    const { records, totalCount } = pageResult;

    if (records.length === 0) {
      logger.info({ offset }, "No more records, stopping");
      break;
    }

    totalFetched += records.length;
    logger.info({ pageFetched: records.length, totalFetched, totalCount, offset }, "BOAMP page fetched");

    const result = await processPage(params, records);
    totalStored += result.stored;
    totalErrors += result.errors;

    // Single page mode: stop after the first fetch
    if (singlePage) break;

    // Paginate-all mode: stop when we've fetched everything
    if (totalFetched >= totalCount) {
      logger.info({ totalFetched, totalCount }, "All records fetched");
      break;
    }

    offset += pageSize;
  }

  return {
    success: true,
    totalFetched,
    totalStored,
    errors: totalErrors,
  };
}
