import test from "node:test"; import assert from "node:assert";
import { AgentRuntime, createMessageMemory, stringToUuid } from "@elizaos/core";
import { generatePrivateKey } from "viem/accounts";
import { startMock } from "./mock.js";
import plugin from "../src/index.js";

test("real ElizaOS AgentRuntime: register plugin, run both actions against mock with real x402 signature", async () => {
  const m = await startMock();
  try {
    const runtime = new AgentRuntime({
      character: { name: "Analyst", bio: ["test"], plugins: [],
        settings: { secrets: { BIQ_PRIVATE_KEY: generatePrivateKey(), BIQ_BASE_URL: m.url } } },
    });
    await runtime.registerPlugin(plugin);
    const names = runtime.actions.map((a) => a.name);
    assert.ok(names.includes("BLOCKCHAINIQ_BRIEF") && names.includes("BLOCKCHAINIQ_EVENT_RISK"));
    const msg = createMessageMemory({ entityId: stringToUuid("u"), agentId: runtime.agentId, roomId: stringToUuid("r"), content: { text: "brief?" } });
    for (const name of ["BLOCKCHAINIQ_BRIEF", "BLOCKCHAINIQ_EVENT_RISK"]) {
      const a = runtime.actions.find((x) => x.name === name);
      assert.ok(await a.validate(runtime, msg));
      let said; const r = await a.handler(runtime, msg, undefined, {}, (x) => { said = x; return []; });
      assert.ok(r.success, name); assert.equal(said.content.settlement.verified, true, name);
    }
  } finally { m.close(); }
});
