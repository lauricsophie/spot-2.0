import { describe, expect, it, afterAll } from "@jest/globals";
import { processBoampEmbed } from "../services/boamp/boamp-embed-processor";
import { getPool, closePool } from "../db/pool.js";

const TEST_DATE_DEBUT = "2021-01-01";
const TEST_DATE_FIN = "2026-12-31";
const CLEANUP_AFTER_TEST = false;

describe("Integration - BOAMP data to pgvector (no mocks)", () => {
  afterAll(async () => {
    if (CLEANUP_AFTER_TEST) {
      const pool = getPool();
      await pool.query(
        `DELETE FROM boamp_embeddings WHERE metadata->>'dateDebut' = $1 AND metadata->>'dateFin' = $2`,
        [TEST_DATE_DEBUT, TEST_DATE_FIN]
      );
    }
    await closePool();
  });

  it("should fetch BOAMP, generate descriptions, embed and store in pgvector", async () => {
    const result = await processBoampEmbed({
      dateDebut: TEST_DATE_DEBUT,
      dateFin: TEST_DATE_FIN,
      codeDepartement: "973",
      // rows: 3,
      // offset: 0,
    });

    expect(result.success).toBe(true);
    expect(result.totalFetched).toBeGreaterThan(0);
    expect(result.totalStored).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
  }, 60*60*1000);

  it("should have stored records with description and embedding in pgvector", async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT boamp_id_web, description, montant, embedding
       FROM boamp_embeddings
       WHERE metadata->>'dateDebut' = $1 AND metadata->>'dateFin' = $2`,
      [TEST_DATE_DEBUT, TEST_DATE_FIN]
    );

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.boamp_id_web).toBeTruthy();
      expect(row.description).toBeTruthy();
      expect(row.description.length).toBeGreaterThan(50);
      expect(row.embedding).toBeDefined();
    }
  });

  it("should have stored montant when available", async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT boamp_id_web, montant
       FROM boamp_embeddings
       WHERE metadata->>'dateDebut' = $1 AND metadata->>'dateFin' = $2`,
      [TEST_DATE_DEBUT, TEST_DATE_FIN]
    );

    for (const row of rows) {
      if (row.montant !== null) {
        expect(typeof parseFloat(row.montant)).toBe("number");
        expect(parseFloat(row.montant)).toBeGreaterThan(0);
      }
    }
  });

  it("should handle upsert on re-processing the same data", async () => {
    const result = await processBoampEmbed({
      dateDebut: TEST_DATE_DEBUT,
      dateFin: TEST_DATE_FIN,
      codeDepartement: "973",
      rows: 3,
      offset: 0,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toBe(0);

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT boamp_id_web, COUNT(*) as cnt
       FROM boamp_embeddings
       WHERE metadata->>'dateDebut' = $1 AND metadata->>'dateFin' = $2
       GROUP BY boamp_id_web
       HAVING COUNT(*) > 1`,
      [TEST_DATE_DEBUT, TEST_DATE_FIN]
    );

    expect(rows.length).toBe(0);
  }, 120_000);
});