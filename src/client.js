// Minimal Blockchain IQ x402 client. Signer is pluggable; no keys in code.
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export const DEFAULT_BASE_URL = "https://www.blockchainiq.co/api/x402/v1";

/** Resolve a viem account: explicit > BIQ_SIGNER_MODULE (exports default/account) > BIQ_PRIVATE_KEY. */
export async function resolveAccount(env = process.env, explicit) {
  if (explicit) return explicit;
  if (env.BIQ_SIGNER_MODULE) {
    const m = await import(env.BIQ_SIGNER_MODULE);
    const a = m.account ?? m.default;
    return typeof a === "function" ? await a() : a;
  }
  if (env.BIQ_PRIVATE_KEY) {
    const { privateKeyToAccount } = await import("viem/accounts");
    return privateKeyToAccount(env.BIQ_PRIVATE_KEY);
  }
  throw new Error("No signer: set BIQ_PRIVATE_KEY or BIQ_SIGNER_MODULE");
}

export function createPayFetch(account, { maxUsd = 0.06, baseFetch = fetch } = {}) {
  const client = x402Client.fromConfig({
    schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
    spendControls: { maxAmountPerPayment: maxUsd },
  });
  return wrapFetchWithPayment(baseFetch, client);
}

/** Call a resource. Pass `payFetch` to inject (tests / custom signers). */
export async function callResource(resource = "brief", opts = {}) {
  const env = opts.env ?? process.env;
  const base = opts.baseUrl ?? env.BIQ_BASE_URL ?? DEFAULT_BASE_URL;
  const payFetch = opts.payFetch ?? createPayFetch(await resolveAccount(env, opts.account), {
    maxUsd: Number(env.BIQ_MAX_USD ?? 0.06),
  });
  const qs = opts.query ? "?" + new URLSearchParams(opts.query) : "";
  const res = await payFetch(`${base}/${resource}${qs}`);
  if (!res.ok) throw new Error(`Blockchain IQ ${resource}: HTTP ${res.status}`);
  const body = await res.json();
  const hdr = res.headers.get("payment-response");
  return { data: body.data ?? body, settlement: hdr ? decodePaymentResponseHeader(hdr) : null };
}

export const getBrief = (opts) => callResource("brief", opts);
export const getEventRisk = (days = 7, opts = {}) => callResource("event-risk", { ...opts, query: { days } });

/** Unpaid probe: returns decoded PAYMENT-REQUIRED (no signing). */
export async function probe(resource = "brief", baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/${resource}`);
  const h = res.headers.get("payment-required");
  return { status: res.status, required: h ? JSON.parse(Buffer.from(h, "base64").toString()) : null };
}
