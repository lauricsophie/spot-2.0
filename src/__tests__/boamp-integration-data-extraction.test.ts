import { describe, expect, it } from "@jest/globals";
import { processDocuments } from "../services/boamp/boamp-data-extractor";
import { sectorReferences } from "../data/sector-reference.js";
import { parseAgentResponse } from '../lib/util';

const refByType = Object.fromEntries(sectorReferences.map((r) => [r.typeMarche, r.sectors.map((s) => s.sectorId)]));
const validTravauxSectorIds = refByType["TRAVAUX"];
const validServicesSectorIds = refByType["SERVICES"];
const validFournituresSectorIds = refByType["FOURNITURES"];

/** Wrap an assertion block so any failure includes the BOAMP idweb */
function assertWithId(idweb: string, fn: () => void) {
  try {
    fn();
  } catch (e: any) {
    throw new Error(`[BOAMP ${idweb}] ${e.message}`);
  }
}

describe("Integration Test - Full Process", () => {
  it("should process Guyane BOAMP documents and extract structured data", async () => {
    const result = await processDocuments({
      dateDebut: "2025-01-01",
      dateFin: "2025-01-15",
      codeDepartement: "973",
      rows: 5,
      offset: 0,
    });

    expect(result.success).toBe(true);
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results.length).toBeGreaterThan(0);

    for (const docResult of result.results) {
      const id = docResult.idweb;
      assertWithId(id, () => {
        expect(docResult.idweb).toBeDefined();
        expect(docResult.success).toBe(true);
        expect(docResult.result).toBeDefined();
      });

      console.log(`\n=== Document traité ${id} ===`);
      console.log("Réponse brute:", docResult.result);
    }
  }, 120000);

  it("should return valid JSON with expected schema", async () => {
    const result = await processDocuments({
      dateDebut: "2025-01-01",
      dateFin: "2025-01-15",
      codeDepartement: "973",
      rows: 1,
      offset: 0,
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    for (const docResult of result.results) {
      const id = docResult.idweb;
      assertWithId(id, () => {
        expect(docResult.success).toBe(true);
      });

      const extracted = parseAgentResponse(docResult.result!);
      assertWithId(id, () => {
        expect(extracted).not.toBeNull();
      });

      console.log(`\n=== Données extraites ${id} ===`);
      console.log(JSON.stringify(extracted, null, 2));

      assertWithId(id, () => {
        // Validate required fields exist
        expect(extracted).toHaveProperty("operation");
        expect(extracted).toHaveProperty("lieuExecution");
        expect(extracted!.lieuExecution).toHaveProperty("lieuExecutionId");
        expect(extracted!.lieuExecution).toHaveProperty("lieuExecutionNom");
        expect(extracted).toHaveProperty("montant");
        expect(extracted).toHaveProperty("acheteur");
        expect(extracted!.acheteur).toHaveProperty("idMoa");
        expect(extracted!.acheteur).toHaveProperty("nomAcheteurOriginal");
        expect(extracted!.acheteur).toHaveProperty("descripteur_code");
        expect(extracted).toHaveProperty("typeOperation");
        expect(extracted!.typeOperation).toHaveProperty("typeMarche");
        expect(extracted!.typeOperation).toHaveProperty("sector");
        expect(extracted!.typeOperation).toHaveProperty("sousSecteur");
        expect(extracted).toHaveProperty("allotissement");
        expect(extracted).toHaveProperty("confidence");

        // Validate types
        expect(typeof extracted!.operation).toBe("string");
        expect(typeof extracted!.acheteur.nomAcheteurOriginal).toBe("string");
        expect(["SERVICES", "FOURNITURES", "TRAVAUX"]).toContain(extracted!.typeOperation.typeMarche);

        // sector and sousSecteur validation per typeMarche
        if (extracted!.typeOperation.typeMarche === "TRAVAUX") {
          expect(validTravauxSectorIds).toContain(extracted!.typeOperation.sector);
          expect(extracted!.typeOperation.sousSecteur).toBeTruthy();
        } else if (extracted!.typeOperation.typeMarche === "SERVICES") {
          expect(validServicesSectorIds).toContain(extracted!.typeOperation.sector);
          expect(extracted!.typeOperation.sousSecteur).toBeTruthy();
        } else if (extracted!.typeOperation.typeMarche === "FOURNITURES") {
          expect(validFournituresSectorIds).toContain(extracted!.typeOperation.sector);
          expect(extracted!.typeOperation.sousSecteur).toBeTruthy();
        }

        expect(typeof extracted!.confidence).toBe("number");
        expect(extracted!.confidence).toBeGreaterThanOrEqual(0);
        expect(extracted!.confidence).toBeLessThanOrEqual(100);

        // idMoa should be number or null
        if (extracted!.acheteur.idMoa !== null) {
          expect(typeof extracted!.acheteur.idMoa).toBe("number");
        }

        // montant should be number or null
        if (extracted!.montant !== null) {
          expect(typeof extracted!.montant).toBe("number");
        }

        // lieuExecutionNom should be string or null, consistent with lieuExecutionId
        if (extracted!.lieuExecution.lieuExecutionId !== null) {
          expect(typeof extracted!.lieuExecution.lieuExecutionNom).toBe("string");
        } else {
          expect(extracted!.lieuExecution.lieuExecutionNom).toBeNull();
        }
      });
    }
  }, 120000);

  it("should match MOA when known organization is present", async () => {
    const result = await processDocuments({
      dateDebut: "2025-01-01",
      dateFin: "2025-01-15",
      codeDepartement: "973",
      rows: 6,
      offset: 0,
    });

    expect(result.success).toBe(true);

    let moaMatchFound = false;

    for (const docResult of result.results) {
      if (!docResult.success || !docResult.result) continue;

      const id = docResult.idweb;
      const extracted = parseAgentResponse(docResult.result);
      if (!extracted) continue;

      console.log(`\n--- Document ${id} ---`);
      console.log(`Acheteur original: ${extracted.acheteur.nomAcheteurOriginal}`);
      console.log(`idMoa: ${extracted.acheteur.idMoa}`);
      console.log(`Type marché: ${extracted.typeOperation.typeMarche}`);
      console.log(`Sector: ${extracted.typeOperation.sector} / ${extracted.typeOperation.sousSecteur}`);
      console.log(`Confidence: ${extracted.confidence}%`);

      if (extracted.acheteur.idMoa !== null) {
        moaMatchFound = true;
        assertWithId(id, () => {
          expect(typeof extracted.acheteur.idMoa).toBe("number");
        });
      }
    }

    console.log(`\nMOA match trouvé: ${moaMatchFound}`);
  }, 180000);

  it("should validate allotissement lot fields when present", async () => {
    const result = await processDocuments({
      dateDebut: "2025-01-01",
      dateFin: "2025-01-15",
      codeDepartement: "973",
      rows: 20,
      offset: 0,
    });

    expect(result.success).toBe(true);

    let allotissementFound = false;

    for (const docResult of result.results) {
      if (!docResult.success || !docResult.result) continue;

      const id = docResult.idweb;
      const extracted = parseAgentResponse(docResult.result);
      if (!extracted) continue;

      const allotissement = extracted.allotissement;
      if (allotissement === null || allotissement === undefined) continue;

      allotissementFound = true;
      console.log(`\n--- Allotissement ${id} ---`);
      console.log(JSON.stringify(allotissement, null, 2));

      assertWithId(id, () => {
        expect(allotissement).toHaveProperty("lots");
        expect(Array.isArray(allotissement.lots)).toBe(true);
        expect(allotissement.lots.length).toBeGreaterThan(0);

        for (let i = 0; i < allotissement.lots.length; i++) {
          const lot = allotissement.lots[i];

          // lotId: must be a non-empty string identifier
          expect(lot).toHaveProperty("lotId");
          expect(typeof lot.lotId).toBe("string");
          expect(lot.lotId.length).toBeGreaterThan(0);

          // nom: string
          expect(lot).toHaveProperty("nom");
          expect(typeof lot.nom).toBe("string");

          // entrepriseAttributaire: string
          expect(lot).toHaveProperty("entrepriseAttributaire");
          expect(typeof lot.entrepriseAttributaire).toBe("string");

          // dateAttribution: string au format YYYY-MM-DD
          expect(lot).toHaveProperty("dateAttribution");
          expect(typeof lot.dateAttribution).toBe("string");
          expect(lot.dateAttribution).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // montant: number
          expect(lot).toHaveProperty("montant");
          expect(typeof lot.montant).toBe("number");
        }
      });
    }

    console.log(`\nAllotissement trouvé: ${allotissementFound}`);
  }, 180000);
});