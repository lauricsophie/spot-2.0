import { config } from "../../config";
import type { BoampAnnonce } from "../../types/boamp.type";

export interface BoampQueryParams {
  dateDebut: string;
  dateFin: string;
  codeDepartement: string;
  rows?: number;
  offset?: number;
  boampId?: string;
}

export interface BoampResponse {
  total_count: number;
  results: BoampAnnonce[];
}

export function parseJsonFields(data: BoampResponse): BoampResponse {
  return {
    ...data,
    results: data.results.map((record) => ({
      ...record,
      gestion: record.gestion ? JSON.parse(record.gestion) : null,
      donnees: record.donnees ? JSON.parse(record.donnees) : null,
    })),
  };
}

export function buildEndpointUrl(params: BoampQueryParams): string {
  let whereStr = `dateparution >= "${params.dateDebut}"`;
  whereStr += ` AND dateparution <= "${params.dateFin}"`;
  whereStr += ` AND code_departement = ${params.codeDepartement}`;

  if (params.boampId) {
    whereStr += ` AND idweb = "${params.boampId}"`;
  }

  const url = new URL(config.BOAMP_ENDPOINT);
  url.searchParams.set("dataset", "boamp");
  url.searchParams.set("where", whereStr);
  url.searchParams.set("order_by", "dateparution");
  url.searchParams.set("rows", (params.rows ?? 20).toString());
  url.searchParams.set("offset", (params.offset ?? 0).toString());

  return url.toString();
}