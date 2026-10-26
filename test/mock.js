import http from "node:http";
import { verifyTypedData } from "viem";
export const seen = [];
// Local mock x402 server: 402 without payment header, 200 + PAYMENT-RESPONSE with one.
export function startMock(port = 0) {
  const req402 = { x402Version: 2, error: "Payment required", resource: { url: "mock/brief" },
    accepts: [{ scheme: "exact", network: "eip155:8453", amount: "10000",
      asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: "0x0000000000000000000000000000000000000001",
      maxTimeoutSeconds: 300, extra: { name: "USD Coin", version: "2" } }] };
  const settle = { success: true, transaction: "0xmocktx", network: "eip155:8453", payer: "0xmockpayer" };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64");
  const srv = http.createServer(async (q, r) => {
    if (!/\/(brief|event-risk)/.test(q.url)) { r.writeHead(404); return r.end(); }
    if (!q.headers["payment-signature"] && !q.headers["x-payment"]) {
      r.writeHead(402, { "content-type": "application/json", "payment-required": b64(req402) });
      return r.end("{}");
    }
    const raw = q.headers["payment-signature"] || q.headers["x-payment"];
    let verified = false, payer = "0xmockpayer";
    if (raw !== "stub") {
      try {
        const p = JSON.parse(Buffer.from(raw, "base64").toString());
        const a = p.payload.authorization; payer = a.from;
        verified = await verifyTypedData({ address: a.from, signature: p.payload.signature,
          domain: { name: "USD Coin", version: "2", chainId: 8453, verifyingContract: req402.accepts[0].asset },
          types: { TransferWithAuthorization: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] },
          primaryType: "TransferWithAuthorization",
          message: { ...a, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore) } });
        seen.push({ payer, verified, value: a.value, to: a.to });
      } catch (e) { seen.push({ error: String(e) }); }
      if (!verified) { r.writeHead(402); return r.end('{"error":"bad signature"}'); }
    }
    r.writeHead(200, { "content-type": "application/json", "payment-response": b64({ ...settle, payer, verified }) });
    r.end(JSON.stringify({ data: { assets: [{ symbol: "BTC", price: 1 }], events: [], riskFlags: [] } }));
  });
  return new Promise((ok) => srv.listen(port, () => ok({ url: `http://127.0.0.1:${srv.address().port}`, close: () => { srv.closeAllConnections(); srv.close(); } })));
}
// Stub "paid" fetch: retries with a fake header. No real signing.
export const stubPayFetch = async (url, init = {}) => {
  const r = await fetch(url, init);
  if (r.status !== 402) return r;
  return fetch(url, { ...init, headers: { ...(init.headers || {}), "PAYMENT-SIGNATURE": "stub" } });
};
