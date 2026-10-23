import type { DecpAnnonce } from "../../types/decp.type";
import { isInGuyaneAgent } from "../../mastra/agents/is-in-guyane-agent";
import { logger } from "../../lib/logger";
import { withRetry } from "../../lib/retry";

/**
 * Vérifie si un enregistrement DECP est localisé en Guyane
 * en envoyant ses champs de localisation à l'agent IA.
 */
export async function isInGuyane(record: DecpAnnonce): Promise<boolean> {
  // Short-circuit : si le typecode est "Code département", on peut trancher sans IA
  if (record.lieuexecution_typecode?.toLowerCase() === "code département" && record.lieuexecution_code) {
    return record.lieuexecution_code.trim() === "973";
  }

  const fields: Record<string, string> = {};
  if (record.lieuexecution_code) fields["lieuexecution_code"] = record.lieuexecution_code;
  if (record.lieuexecution_nom) fields["lieuexecution_nom"] = record.lieuexecution_nom;
  if (record.lieuexecution_typecode) fields["lieuexecution_typecode"] = record.lieuexecution_typecode;

  if (Object.keys(fields).length === 0) return false;

  const prompt = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const response = await withRetry(
    () => isInGuyaneAgent.generate(prompt),
    "is-in-guyane-agent"
  );
  const text = response.text.trim().toLowerCase();

  if (text === "true") return true;
  if (text === "false") return false;

  logger.error({ response: text, fields }, "Failed to parse is-in-guyane agent response");
  return false;
}