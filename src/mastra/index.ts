import { Mastra } from "@mastra/core";
import { documentAgent } from "./agents/document-agent";
import { decpAgent } from "./agents/decp-agent";

export const mastra = new Mastra({
  agents: { documentAgent, decpAgent },
});
