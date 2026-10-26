import test from "node:test"; import assert from "node:assert";
import { startMock, stubPayFetch } from "./mock.js";
import { getBrief, probe, resolveAccount } from "../src/client.js";
import plugin from "../src/index.js";
test("mock: 402 then paid 200 with settlement", async () => {
  const m = await startMock();
  try {
    const p = await probe("brief", m.url); assert.equal(p.status, 402); assert.equal(p.required.accepts[0].amount, "10000");
    const out = await getBrief({ baseUrl: m.url, payFetch: stubPayFetch });
    assert.equal(out.settlement.transaction, "0xmocktx"); assert.ok(out.data.assets);
  } finally { m.close(); }
});
test("no signer configured -> clear error", async () => { await assert.rejects(resolveAccount({}), /No signer/); });
test("live: unpaid brief returns 402 for $0.01 on Base", { skip: process.env.SKIP_LIVE === "1" }, async () => {
  const p = await probe("brief");
  assert.equal(p.status, 402); assert.equal(p.required.accepts[0].network, "eip155:8453"); assert.equal(p.required.accepts[0].amount, "10000");
});
test("plugin action via mock", async () => {
  const m = await startMock();
  try {
    const rt = { getSetting: (k) => ({ BIQ_PRIVATE_KEY: "set" })[k] };
    const a = plugin.actions[0]; assert.ok(await a.validate(rt));
    let said; const r = await a.handler(rt, {}, {}, { baseUrl: m.url, payFetch: stubPayFetch }, (x) => { said = x; });
    assert.ok(r.success); assert.match(said.text, /BTC: 1.*0xmocktx/);
  } finally { m.close(); }
});
