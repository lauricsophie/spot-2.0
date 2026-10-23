import { config } from "../../config";
import { fetchDocuments, type FetchResult } from "../boamp/boamp-fetcher";
import { logger } from "../../lib/logger";
import { DecpAnnonce } from '../../types/decp.type';

export interface DecpFetchParams {
  datepublicationdonnees?: string;
  id?: string;
  rows: number;
  offset: number;
}

export interface DecpResponse {
  results: DecpAnnonce[];
  total_count?: number;

  [key: string]: unknown;
}

function buildDecpUrl(params: DecpFetchParams): string {
  if (!config.DECP_ENDPOINT) {
    throw new Error("DECP_ENDPOINT is required");
  }
  if (!params.datepublicationdonnees && !params.id) {
    throw new Error("DecpFetchParams requires at least one of: datepublicationdonnees, id");
  }
  const url = new URL(config.DECP_ENDPOINT);
  const clauses: string[] = [];
  if (params.datepublicationdonnees) {
    clauses.push(`datepublicationdonnees='${params.datepublicationdonnees}'`);
  }
  if (params.id) {
    clauses.push(`id="${params.id}"`);
  }
  url.searchParams.set("where", clauses.join(" AND "));
  url.searchParams.set("limit", params.rows.toString());
  url.searchParams.set("offset", params.offset.toString());
  return url.toString();
}

export async function fetchDecpDocuments(
  params: DecpFetchParams,
): Promise<FetchResult<DecpResponse>> {
  const endpoint = buildDecpUrl(params);
  logger.info({ endpoint, params }, "Fetching DECP documents");
  return fetchDocuments<DecpResponse>({ endpoint });
}