// ElizaOS plugin for Blockchain IQ's x402 API.
import { getBrief, getEventRisk } from "./client.js";

const envFrom = (runtime) => ({
  ...process.env,
  ...Object.fromEntries(["BIQ_PRIVATE_KEY", "BIQ_SIGNER_MODULE", "BIQ_BASE_URL", "BIQ_MAX_USD"]
    .map((k) => [k, runtime?.getSetting?.(k)]).filter(([, v]) => v)),
});

const fmtBrief = (d) => (d.assets ?? d.prices ?? []).map((a) => `${a.symbol ?? a.asset}: ${a.price ?? a.priceUsd}`).join(", ") || JSON.stringify(d).slice(0, 800);

export const briefAction = {
  name: "BLOCKCHAINIQ_BRIEF",
  similes: ["CRYPTO_BRIEF", "MARKET_BRIEF"],
  description: "Buy a $0.01 Blockchain IQ market brief (BTC/ETH/SOL/XRP, next-48h events, risk flags) via x402.",
  validate: async (runtime) => Boolean(envFrom(runtime).BIQ_PRIVATE_KEY || envFrom(runtime).BIQ_SIGNER_MODULE),
  handler: async (runtime, message, state, options = {}, callback) => {
    const out = await getBrief({ env: envFrom(runtime), ...options });
    const text = `Market brief: ${fmtBrief(out.data)}` + (out.settlement?.transaction ? ` (tx ${out.settlement.transaction})` : "");
    await callback?.({ text, content: out });
    return { success: true, text, data: out };
  },
  examples: [[{ name: "{{user}}", content: { text: "Give me a crypto market brief" } },
              { name: "{{agent}}", content: { text: "Fetching the brief.", actions: ["BLOCKCHAINIQ_BRIEF"] } }]],
};

export const eventRiskAction = {
  name: "BLOCKCHAINIQ_EVENT_RISK",
  similes: ["MACRO_CALENDAR", "EVENT_RISK"],
  description: "Buy a $0.05 Blockchain IQ event-risk calendar (next 7 days) via x402.",
  validate: briefAction.validate,
  handler: async (runtime, message, state, options = {}, callback) => {
    const out = await getEventRisk(options.days ?? 7, { env: envFrom(runtime), ...options });
    const text = `Event risk: ${JSON.stringify(out.data).slice(0, 800)}`;
    await callback?.({ text, content: out });
    return { success: true, text, data: out };
  },
  examples: [[{ name: "{{user}}", content: { text: "What macro events are coming this week?" } },
              { name: "{{agent}}", content: { text: "Checking event risk.", actions: ["BLOCKCHAINIQ_EVENT_RISK"] } }]],
};

export const blockchainIqPlugin = {
  name: "blockchainiq",
  description: "Pay-per-call crypto market data from Blockchain IQ over x402 (USDC on Base).",
  actions: [briefAction, eventRiskAction],
};
export default blockchainIqPlugin;
