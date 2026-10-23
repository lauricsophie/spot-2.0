import { describe, expect, it } from "@jest/globals";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { processDocuments } from "../services/boamp/boamp-data-extractor";
import type { ExtractionResult } from "../services/boamp/boamp-data-extractor";

const CSV_PATH = resolve(process.cwd(), "src/__tests__/ressource/test.csv");

const idwebList = [
  '24-145876',
  '25-111237',
  '26-12941',
  '26-11380',
  '26-15777',
  '26-54642',
  '26-55069',
  '26-53759',
  '26-53763',
  '26-54254',
  '26-53766',
  '26-51693',
  '26-62548',
  '26-62161',
  '26-61587',
  '26-61811',
  '26-61122',
  '26-50062',
  '26-50056',
  '26-51212',
  '26-49564',
  '26-48580',
  '26-48337',
  '26-48389',
  '26-46706',
  '26-33764',
  '26-63842',
  '26-62797',
  '26-63102',
  '26-63077',
  '26-62781',
  '26-62796',
  '26-62793',
  '26-42523',
  '26-64922',
  '26-65436',
  '26-65334',
  '26-64329',
  '26-64629',
  '26-64734',
  '26-64130',
  '26-64272',
  '26-66030',
  '26-66020',
  '26-66610',
  '26-66035',
];

// ---------- CSV (RFC 4180 : guillemets doublés, retours ligne dans les champs) ----------

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((f) => (/[",\n\r]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f))
        .join(","),
    )
    .join("\n");
}

// ---------- Mise en forme des valeurs extraites ----------

const asText = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

/** Numéro de lot du CSV ("1", "Lot N° 2", "LOT-0001") -> nombre, pour rapprochement avec lotId. */
function lotNumber(label: string): number | null {
  const digits = label.match(/\d+/);
  return digits ? parseInt(digits[0], 10) : null;
}

function findLot(extraction: ExtractionResult, label: string, fallbackIndex: number) {
  const lots = extraction.allotissement?.lots;
  if (!lots || lots.length === 0) return undefined;

  const wanted = lotNumber(label);
  if (wanted !== null) {
    const byId = lots.find((lot) => lotNumber(asText(lot.lotId)) === wanted);
    if (byId) return byId;
  }
  return lots[fallbackIndex];
}

/** Valeur à écrire dans la colonne "extraction" pour une ligne du CSV. */
function extractedValue(
  extraction: ExtractionResult,
  numeroLot: string,
  colonne: string,
  fallbackIndex: number,
): string {
  const col = colonne.trim().toLowerCase();

  // Lignes de lot : rapprochement via le numéro de lot
  if (numeroLot.trim() !== "") {
    const lot = findLot(extraction, numeroLot, fallbackIndex);
    if (!lot) return "";
    switch (col) {
      case "nom lot":
        return asText(lot.nom);
      case "entreprise attributaire":
      case "entr attributaire":
        return asText(lot.entrepriseAttributaire);
      case "date attribution":
        return asText(lot.dateAttribution);
      case "montant":
        return asText(lot.montant);
      default:
        return "";
    }
  }

  // Lignes de tête
  switch (col) {
    case "operation":
      return asText(extraction.operation);
    case "lieuexecution": {
      const { lieuExecutionNom, lieuExecutionId } = extraction.lieuExecution ?? {};
      if (lieuExecutionId === null || lieuExecutionId === undefined) return asText(lieuExecutionNom);
      return `${asText(lieuExecutionNom)} (${lieuExecutionId})`;
    }
    case "montant":
      return asText(extraction.montant);
    case "idmoa":
      return asText(extraction.acheteur?.idMoa);
    case "nomacheteuroriginal":
      return asText(extraction.acheteur?.nomAcheteurOriginal);
    case "sector":
      return asText(extraction.typeOperation?.sector);
    case "soussecteur":
      return asText(extraction.typeOperation?.sousSecteur);
    case "nombre de lots":
      return extraction.allotissement
        ? asText(extraction.allotissement.lots.length)
        : "";
    // Champs absents du schéma d'extraction de l'agent : laissés vides
    default:
      return "";
  }
}

describe("Test File - Full Process", () => {
  it("remplit la colonne 'extraction' de test.csv pour chaque idweb", async () => {
    const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
    const header = rows[0];
    const iId = header.indexOf("id");
    const iLot = header.indexOf("numero lot");
    const iCol = header.indexOf("colonne");
    const iExtraction = header.indexOf("extraction");
    expect([iId, iLot, iCol, iExtraction].every((i) => i >= 0)).toBe(true);

    const failures: { idweb: string; error: string }[] = [];

    for (const idweb of idwebList) {
      console.log("\n=== IDWEB à traiter ===");
      console.log("idweb:", idweb);

      let extraction: ExtractionResult | undefined;
      try {
        const result = await processDocuments({
          dateDebut: "2000-01-01",
          dateFin: "2099-12-31",
          boampId: idweb,
          codeDepartement: "973",
          rows: 1,
          offset: 0,
        });
        extraction = result.results[0]?.result;
        if (!extraction) throw new Error(result.results[0]?.error ?? "aucun résultat");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ idweb, error: message });
        console.error("Échec:", idweb, message);
        continue;
      }

      console.log("\n=== Document traité ===");
      console.log("Réponse brute:", JSON.stringify(extraction));

      // Index des lots rencontrés pour cet idweb, dans l'ordre d'apparition du CSV
      const lotOrder: string[] = [];
      for (const row of rows.slice(1)) {
        if (row[iId] !== idweb) continue;
        const lotLabel = (row[iLot] ?? "").trim();
        if (lotLabel !== "" && !lotOrder.includes(lotLabel)) lotOrder.push(lotLabel);
      }

      let filled = 0;
      for (const row of rows.slice(1)) {
        if (row[iId] !== idweb) continue;
        while (row.length <= iExtraction) row.push("");
        if ((row[iExtraction] ?? "").trim() !== "") continue; // on ne réécrit pas les cellules déjà remplies

        const lotLabel = (row[iLot] ?? "").trim();
        const value = extractedValue(
          extraction,
          lotLabel,
          row[iCol] ?? "",
          Math.max(0, lotOrder.indexOf(lotLabel)),
        );
        if (value !== "") {
          row[iExtraction] = value;
          filled++;
        }
      }

      // Écriture incrémentale : la progression survit à une interruption
      writeFileSync(CSV_PATH, serializeCsv(rows), "utf8");
      console.log(`CSV mis à jour : ${filled} cellules remplies pour ${idweb}`);
    }

    if (failures.length > 0) {
      console.error("\n=== Échecs ===");
      failures.forEach((f) => console.error(`${f.idweb}: ${f.error}`));
    }
    console.log(`\nTerminé : ${idwebList.length - failures.length}/${idwebList.length} idweb extraits`);

    expect(failures).toEqual([]);
  }, 3_600_000);
});