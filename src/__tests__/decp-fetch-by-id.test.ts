import { describe, expect, it } from "@jest/globals";
import { fetchDecpDocuments } from "../services/decp/decp-fetcher";

const decpIdList = [
  "2021261600",
];

describe("DECP - Fetch by id", () => {
  it("should fetch a DECP record for each id in the list", async () => {
    for (const id of decpIdList) {
      console.log("\n=== ID DECP à récupérer ===");
      console.log("id:", id);

      const fetchResult = await fetchDecpDocuments({
        id,
        rows: 1,
        offset: 0,
      });

      expect(fetchResult.success).toBe(true);
      const totalCount = fetchResult.data?.total_count ?? 0;
      expect(totalCount).toBeGreaterThanOrEqual(1);

      const record = fetchResult.data?.results?.[0];
      expect(record).toBeDefined();
      expect(record?.id).toBe(id);

      console.log("\n=== Enregistrement récupéré ===");
      console.log("id:", record?.id);
      console.log("objet:", record?.objet);
      console.log("montant:", record?.montant);
      console.log("acheteur:", record?.acheteur);
    }
  }, 120_000);
});
