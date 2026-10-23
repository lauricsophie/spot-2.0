import { describe, expect, it } from "@jest/globals";
import { fetchDecpDocuments } from "../services/decp/decp-fetcher";
import { fetchDocuments } from "../services/boamp/boamp-fetcher";
import {
  buildEndpointUrl,
  parseJsonFields,
  type BoampResponse,
} from "../services/boamp/boamp-common";

// === Paramètres à ajuster en dur ===
const DATE_DEBUT = "2024-01-01";
const DATE_FIN = "2026-12-31";
const CODE_DEPARTEMENT = "973";
const PAGE_SIZE = 10;
// ===================================

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

describe("BOAMP → DECP matching via identifiantInterne", () => {
  it("paginé sur l'API BOAMP, cherche un DECP pour chaque idInterne trouvé", async () => {
    let totalProcessed = 0;
    let boampsWithDecp = 0;
    let offset = 0;

    while (true) {
      const endpoint = buildEndpointUrl({
        dateDebut: DATE_DEBUT,
        dateFin: DATE_FIN,
        codeDepartement: CODE_DEPARTEMENT,
        rows: PAGE_SIZE,
        offset,
      });

      const fetchResult = await fetchDocuments<BoampResponse>({ endpoint });
      if (!fetchResult.success || !fetchResult.data) {
        console.log(`✗ Fetch BOAMP échoué à l'offset ${offset}: ${fetchResult.error}`);
        break;
      }

      const parsed = parseJsonFields(fetchResult.data);
      const totalCount = parsed.total_count;

      if (offset === 0) {
        console.log(
          `\n=== ${totalCount} BOAMPs entre ${DATE_DEBUT} et ${DATE_FIN} (dept ${CODE_DEPARTEMENT}) ===\n`,
        );
      }

      if (parsed.results.length === 0) break;

      for (const record of parsed.results) {
        totalProcessed++;
        const donnees = record.donnees as unknown as
          | { FNSimple?: { initial?: { communication?: { identifiantInterne?: string } } } }
          | null;
        const idInterne = donnees?.FNSimple?.initial?.communication?.identifiantInterne;
        if (!idInterne) continue;

        let foundForBoamp = false;
        for (const year of YEARS) {
          const candidate = `${year}${idInterne}`;
          const decpResult = await fetchDecpDocuments({
            id: candidate,
            rows: 1,
            offset: 0,
          });
          if ((decpResult.data?.total_count ?? 0) >= 1) {
            console.log(`  ✓ ${record.idweb} (idInterne=${idInterne}) → ${candidate}`);
            foundForBoamp = true;
          }
        }
        if (foundForBoamp) boampsWithDecp++;
      }

      if (offset + parsed.results.length >= totalCount) break;
      offset += PAGE_SIZE;
    }

    console.log("\n=== Résumé ===");
    console.log(`BOAMPs avec DECP / total : ${boampsWithDecp} / ${totalProcessed}`);

    expect(true).toBe(true);
  }, 30 * 60_000);
});