import { logger } from "../../lib/logger";
import { fetchDocuments } from "./boamp-fetcher";
import { boampDescriptionAgent } from "../../mastra/agents/boamp-description-agent";
import { generateEmbeddings } from "../embedding-service";
import { findSimilarDecpByEmbedding, type SimilarDecpResult } from "../vector-store";
import { buildEndpointUrl, parseJsonFields, type BoampResponse } from "./boamp-common";

export interface BoampEstimateResult {
  success: boolean;
  boampId: string;
  boampDescription?: string;
  averageMontant?: number;
  similarDecp?: SimilarDecpResult[];
  error?: string;
}

export async function processBoampEstimate(boampId: string, codeCpv?: string): Promise<BoampEstimateResult> {
  logger.info({ boampId }, "Starting BOAMP estimate");

  // 1. Fetch the BOAMP record by ID
  const endpoint = buildEndpointUrl({
    dateDebut: "2000-01-01",
    dateFin: "2099-12-31",
    codeDepartement: "973",
    boampId,
    rows: 1,
    offset: 0,
  });

  const fetchResult = await fetchDocuments<BoampResponse>({ endpoint });

  if (!fetchResult.success || !fetchResult.data) {
    return { success: false, boampId, error: fetchResult.error ?? "Failed to fetch BOAMP record" };
  }

  const data = parseJsonFields(fetchResult.data);

  if (data.results.length === 0) {
    return { success: false, boampId, error: "BOAMP record not found" };
  }

  const record = data.results[0];
  logger.info({ boampId, objet: record.objet }, "BOAMP record fetched");

  // 2. Generate AI description
  const response = await boampDescriptionAgent.generate(
    `Voici un enregistrement BOAMP au format JSON. Rédige une description textuelle synthétique de ce marché.\n\n${JSON.stringify(record)}`,
  );
  const description = response.text.trim();
  logger.info({ boampId }, "Description generated");

  // 3. Generate embedding
  const [embedding] = await generateEmbeddings([description]);

  // 4. Find similar DECP records
  const similarDecp = await findSimilarDecpByEmbedding(embedding, 10, codeCpv);
  logger.info({ boampId, found: similarDecp.length }, "Similar DECP records found");

  // 5. Compute average montant from DECP with non-null montant
  const montants = similarDecp
    .map((d) => d.montant)
    .filter((m): m is number => m != null);

  const averageMontant = montants.length > 0
    ? montants.reduce((sum, m) => sum + m, 0) / montants.length
    : undefined;

  return {
    success: true,
    boampId,
    boampDescription: description,
    averageMontant,
    similarDecp,
  };
}