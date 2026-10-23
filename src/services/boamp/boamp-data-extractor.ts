import { getMoaReferenceText } from "../../data/moa-reference";
import { getSectorReferences } from "../../data/sector-reference";
import { logger } from "../../lib/logger";
import { withRetry } from "../../lib/retry";
import { mastra } from "../../mastra";
import { fetchDocuments } from "./boamp-fetcher";
import { parseAgentResponse } from '../../lib/util';
import {
  getLocalityReferenceNameFromId,
  getLocalityReferenceText,
} from '../../data/locality-reference';
import { buildEndpointUrl, parseJsonFields, type BoampQueryParams, type BoampResponse } from "./boamp-common";
import type { BoampAnnonce } from "../../types/boamp.type";


export interface ExtractionResult {
  operation: string;
  lieuExecution: {
    lieuExecutionId: number | null;
    lieuExecutionNom: string | null;
  };
  montant: number | null;
  acheteur: {
    idMoa: number | null;
    nomAcheteurOriginal: string;
    descripteur_code: string[] | null;
  };
  typeOperation: {
    typeMarche: "SERVICES" | "FOURNITURES" | "TRAVAUX";
    sector: string | null;
    sousSecteur: string | null;
  };
  allotissement: {
    lots: {
      lotId: string;
      nom: string;
      entrepriseAttributaire: string;
      dateAttribution: string;
      montant: number;
    }[];
  } | null;
  confidence: number;
}

export interface DocumentResult {
  idweb: string;
  success: boolean;
  result?: ExtractionResult;
  record?: BoampAnnonce;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  totalCount: number;
  processed: number;
  results: DocumentResult[];
  error?: string;
}


export async function processDocuments(params: BoampQueryParams): Promise<ProcessResult> {
  const endpoint = buildEndpointUrl(params);

  logger.info({ endpoint, params }, "Fetching documents");

  const fetchResult = await fetchDocuments<BoampResponse>({ endpoint });

  if (!fetchResult.success || !fetchResult.data) {
    logger.error({ error: fetchResult.error }, "Failed to fetch documents");
    return { success: false, totalCount: 0, processed: 0, results: [], error: fetchResult.error };
  }

  const moaReferenceText = getMoaReferenceText();
  const sectorReferences = getSectorReferences();
  const localityReferences = getLocalityReferenceText();
  const data = parseJsonFields(fetchResult.data);
  const agent = mastra.getAgent("documentAgent");
  const results: DocumentResult[] = [];

  logger.info({ count: data.results.length }, "Processing documents one by one");

  for (const record of data.results) {
    const idweb = (record.idweb as string) || "unknown";

    logger.info({ idweb }, "Processing document");

    try {
      const prompt = `Analyse ce document BOAMP et extrait les informations demandées.

Référence MOA :
${moaReferenceText}

Référence Secteurs :
${sectorReferences}

Référence Localités :
${localityReferences}

Document BOAMP :
${JSON.stringify(record, null, 2)}`;

      const response = await withRetry(
        () => agent.generate(prompt),
        `agent:documentAgent:${idweb}`,
      );

      const extraction: ExtractionResult = parseAgentResponse(response.text);
      extraction.lieuExecution.lieuExecutionNom = getLocalityReferenceNameFromId(extraction.lieuExecution.lieuExecutionId);
      extraction.acheteur.descripteur_code = (record.descripteur_code as string[] | undefined) ?? null;
      results.push({ idweb, success: true, result: extraction, record });
      logger.info({ idweb }, "Document processed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({ idweb, success: false, error: errorMessage });
      logger.error({ idweb, error: errorMessage }, "Failed to process document");
    }
  }

  logger.info(
    { totalCount: data.total_count, processed: results.length },
    "All documents processed",
  );

  return {
    success: true,
    totalCount: data.total_count,
    processed: results.length,
    results,
  };
}
