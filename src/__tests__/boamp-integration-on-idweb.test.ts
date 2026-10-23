import { describe, expect, it } from "@jest/globals";
import { processDocuments } from "../services/boamp/boamp-data-extractor";

const idwebList = [
  //'26-49103',
  '26-40189',
  //25-111237',
  //26-12941',
  //26-11380',
  //26-15777',
];

describe("Integration Test - Full Process", () => {
  it("should process BOAMP with idweb in list", async () => {
    for (const idweb of idwebList) {

      console.log("\n=== IDWEB à traiter ===");
      console.log("idweb:", idweb);

      const result = await processDocuments({
        dateDebut: "2000-01-01",
        dateFin: "2099-12-31",
        boampId: idweb,
        codeDepartement: "75",
        rows: 1,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);

      const firstResult = result.results[0];
      expect(firstResult.idweb).toBeDefined();
      expect(firstResult.success).toBe(true);
      expect(firstResult.result).toBeDefined();

      console.log("\n=== Document traité ===");
      console.log("idweb:", firstResult.idweb);
      console.log("Réponse brute:", firstResult.result);
    }
  }, 120000);
});
