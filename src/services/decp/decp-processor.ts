import { logger } from "../../lib/logger";
import { fetchDecpDocuments, type DecpFetchParams } from "./decp-fetcher";
import { generateEmbeddings } from "../embedding-service";
import { upsertVectorRecords, type VectorRecord } from "../vector-store";
import { decpAgent } from "../../mastra/agents/decp-agent";
import type { DecpAnnonce } from "../../types/decp.type";
import { isInGuyane } from "./decp-util";

export interface DecpProcessParams {
  dateDebut: string;
  dateFin: string;
}

export interface DecpProcessResult {
  success: boolean;
  totalFetched: number;
  totalGuyane: number;
  totalStored: number;
  errors: number;
  error?: string;
}

/**
 * Extrait le montant d'un enregistrement DECP.
 */
function extractMontant(record: DecpAnnonce): number | null {
  if (!record.montant) return null;

  if (typeof record.montant === "object") {
    if (record.montant.valeurGlobale != null && record.montant.valeurGlobale > 0) {
      return record.montant.valeurGlobale;
    }
    if (record.montant.montantPrevisionnel != null && record.montant.montantPrevisionnel > 0) {
      return record.montant.montantPrevisionnel;
    }
  }

  if (typeof record.montant === "number") {
    return record.montant;
  }

  return null;
}

async function generateDescription(record: DecpAnnonce): Promise<string> {
  const response = await decpAgent.generate(
    `Voici un enregistrement DECP au format JSON. Rédige une description textuelle synthétique de ce marché.\n\n${JSON.stringify(record)}`,
  );
  return response.text.trim();
}

async function generateDescriptions(
  records: DecpAnnonce[],
): Promise<string[]> {
  const descriptions: string[] = [];

  for (let i = 0; i < records.length; i++) {
    try {
      const description = await generateDescription(records[i]);
      descriptions.push(description);
      logger.debug(
        { index: i, decpId: records[i].id },
        "DECP description generated",
      );
    } catch (error) {
      logger.error(
        { index: i, decpId: records[i].id, error },
        "Failed to generate DECP description, using fallback",
      );
      const fallback = [records[i].objet, records[i].acheteur?.nom]
        .filter(Boolean)
        .join(" | ");
      descriptions.push(fallback || "N/A");
    }
  }

  return descriptions;
}

async function fetchPage(
  params: DecpFetchParams,
): Promise<{ records: DecpAnnonce[]; totalCount: number } | { error: string }> {
  const fetchResult = await fetchDecpDocuments(params);

  if (!fetchResult.success || !fetchResult.data) {
    return { error: fetchResult.error ?? "Unknown fetch error" };
  }

  return {
    records: fetchResult.data.results,
    totalCount: fetchResult.data.total_count ?? 0,
  };
}

async function processRecords(
  records: DecpAnnonce[],
): Promise<{ stored: number; errors: number }> {
  // Generate descriptions via agent
  const descriptions = await generateDescriptions(records);

  // Generate embeddings
  const embeddings = await generateEmbeddings(descriptions);

  // Build vector records: decp_id, description, code_cpv, montant, embedding
  const vectorRecords: VectorRecord[] = records.map((record, i) => ({
    decpId: String(record.id ?? crypto.randomUUID()),
    description: descriptions[i],
    codeCpv: typeof record.codecpv === "string" ? record.codecpv : null,
    montant: extractMontant(record),
    embedding: embeddings[i],
  }));

  const storeResult = await upsertVectorRecords(vectorRecords);

  return {
    stored: storeResult.inserted + storeResult.updated,
    errors: storeResult.errors,
  };
}

const FETCH_PAGE_SIZE = 100;
const PROCESS_BATCH_SIZE = 10;

/**
 * Génère la liste des dates YYYY-MM-DD entre dateDebut et dateFin inclus.
 */
function getDateRange(dateDebut: string, dateFin: string): string[] {
  const dates: string[] = [];
  const current = new Date(dateDebut);
  const end = new Date(dateFin);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Fetch tous les DECP d'un jour donné et retourne ceux localisés en Guyane.
 */
async function fetchGuyaneRecordsForDate(
  date: string,
): Promise<{ fetched: number; guyaneRecords: DecpAnnonce[]; error?: string }> {
  let offset = 0;
  let fetched = 0;
  const guyaneRecords: DecpAnnonce[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageResult = await fetchPage({
      datepublicationdonnees: date,
      rows: FETCH_PAGE_SIZE,
      offset,
    });

    if ("error" in pageResult) {
      return { fetched, guyaneRecords, error: pageResult.error };
    }

    const { records, totalCount } = pageResult;

    if (records.length === 0) break;

    fetched += records.length;
    const guyaneFlags = await Promise.all(records.map((r) => isInGuyane(r)));
    const filtered = records.filter((_, i) => guyaneFlags[i]);
    guyaneRecords.push(...filtered);

    logger.debug(
      { date, pageFetched: records.length, pageGuyane: filtered.length, fetched, totalCount, offset },
      "DECP page fetched",
    );

    if (fetched >= totalCount) break;
    offset += FETCH_PAGE_SIZE;
  }

  return { fetched, guyaneRecords };
}

export async function processDecp(
  params: DecpProcessParams,
): Promise<DecpProcessResult> {
  const dates = getDateRange(params.dateDebut, params.dateFin);
  let totalFetched = 0;
  let totalGuyane = 0;
  let totalStored = 0;
  let totalErrors = 0;

  logger.info(
    { dateDebut: params.dateDebut, dateFin: params.dateFin, days: dates.length },
    "Starting DECP processing day by day",
  );

  // Phase 1: Fetch all days, collect Guyane records
  const allGuyaneRecords: DecpAnnonce[] = [];

  for (const date of dates) {
    logger.info({ date }, "Fetching DECP for date");

    const { fetched, guyaneRecords, error } = await fetchGuyaneRecordsForDate(date);

    if (error) {
      logger.error({ date, error }, "Failed to fetch DECP for date, skipping");
      totalErrors++;
      continue;
    }

    totalFetched += fetched;
    allGuyaneRecords.push(...guyaneRecords);

    logger.info(
      { date, fetched, guyane: guyaneRecords.length, totalFetched },
      "DECP date completed",
    );
  }

  totalGuyane = allGuyaneRecords.length;
  logger.info(
    { totalFetched, totalGuyane, days: dates.length },
    "Fetch complete, starting processing by batches of 10",
  );

  // Phase 2: Process Guyane records in batches of 10
  for (let i = 0; i < allGuyaneRecords.length; i += PROCESS_BATCH_SIZE) {
    const batch = allGuyaneRecords.slice(i, i + PROCESS_BATCH_SIZE);
    const batchNum = Math.floor(i / PROCESS_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allGuyaneRecords.length / PROCESS_BATCH_SIZE);

    logger.info(
      { batch: batchNum, totalBatches, batchSize: batch.length },
      "Processing DECP batch",
    );

    try {
      const result = await processRecords(batch);
      totalStored += result.stored;
      totalErrors += result.errors;
    } catch (error) {
      logger.error(
        { batch: batchNum, error },
        "Failed to process DECP batch",
      );
      totalErrors += batch.length;
    }
  }

  return {
    success: true,
    totalFetched,
    totalGuyane,
    totalStored,
    errors: totalErrors,
  };
}
