import { getPool } from "../db/pool.js";
import { logger } from "../lib/logger.js";

export interface VectorRecord {
  decpId: string;
  description: string;
  codeCpv: string | null;
  montant: number | null;
  embedding: number[];
}

export async function upsertVectorRecords(
  records: VectorRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  const pool = getPool();
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const record of records) {
      try {
        const vectorStr = `[${record.embedding.join(",")}]`;

        await client.query(
          `INSERT INTO decp_embeddings (decp_id, description_projet, code_cpv, montant, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)
           ON CONFLICT (decp_id) DO UPDATE SET
             description_projet = EXCLUDED.description_projet,
             code_cpv = EXCLUDED.code_cpv,
             montant = EXCLUDED.montant,
             embedding = EXCLUDED.embedding,
             updated_at = NOW()`,
          [
            record.decpId,
            record.description,
            record.codeCpv,
            record.montant,
            vectorStr,
          ]
        );

        inserted++;
      } catch (err) {
        errors++;
        logger.error(
          { err, decpId: record.decpId },
          "Failed to upsert vector record"
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Transaction failed, rolling back");
    throw err;
  } finally {
    client.release();
  }

  logger.info({ inserted, updated, errors }, "Vector upsert completed");
  return { inserted, updated, errors };
}

export interface BoampVectorRecord {
  boampIdWeb: string;
  description: string;
  montant: number | null;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SimilarDecpResult {
  decpId: string;
  description: string;
  montant: number | null;
  distance: number;
}

export async function findSimilarDecpByEmbedding(
  embedding: number[],
  limit = 10,
  codeCpv?: string
): Promise<SimilarDecpResult[]> {
  const pool = getPool();
  const vectorStr = `[${embedding.join(",")}]`;

  const params: unknown[] = [vectorStr, limit];
  const conditions: string[] = [];

  if (codeCpv) {
    params.push(codeCpv);
    conditions.push(`code_cpv = $${params.length}`);
  }

  const innerWhere = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    decp_id: string;
    description_projet: string;
    montant: string | null;
    distance: number;
  }>(
    `SELECT * FROM (
       SELECT decp_id, description_projet, montant, embedding <=> $1::vector AS distance
       FROM decp_embeddings
       ${innerWhere}
       ORDER BY distance
       LIMIT $2
     ) sub
     WHERE distance < 0.1`,
    params
  );

  return rows.map((row) => ({
    decpId: row.decp_id,
    description: row.description_projet,
    montant: row.montant != null ? parseFloat(row.montant) : null,
    distance: row.distance,
  }));
}

export async function upsertBoampVectorRecords(
  records: BoampVectorRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  const pool = getPool();
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const record of records) {
      try {
        const vectorStr = `[${record.embedding.join(",")}]`;

        await client.query(
          `INSERT INTO boamp_embeddings (boamp_id_web, description, montant, embedding, metadata)
           VALUES ($1, $2, $3, $4::vector, $5)
           ON CONFLICT (boamp_id_web) DO UPDATE SET
             description = EXCLUDED.description,
             montant = EXCLUDED.montant,
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()`,
          [
            record.boampIdWeb,
            record.description,
            record.montant,
            vectorStr,
            JSON.stringify(record.metadata ?? {}),
          ]
        );

        inserted++;
      } catch (err) {
        errors++;
        logger.error(
          { err, boampIdWeb: record.boampIdWeb },
          "Failed to upsert BOAMP vector record"
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "BOAMP transaction failed, rolling back");
    throw err;
  } finally {
    client.release();
  }

  logger.info({ inserted, updated, errors }, "BOAMP vector upsert completed");
  return { inserted, updated, errors };
}
