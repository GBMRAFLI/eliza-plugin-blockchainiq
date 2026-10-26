# plugin-blockchainiq (ElizaOS)

ElizaOS plugin that gives an agent pay-per-call crypto market data from [Blockchain IQ](https://www.blockchainiq.co) over [x402](https://x402.org), paid in USDC on Base. No account, no API key.

Actions:
- `BLOCKCHAINIQ_BRIEF` - $0.01: BTC/ETH/SOL/XRP prices and moves, next-48h events, risk flags.
- `BLOCKCHAINIQ_EVENT_RISK` - $0.05: dated macro/crypto events, 7 days ahead.

## Use
```js
import blockchainIqPlugin from "plugin-blockchainiq";
export const character = { name: "Analyst", plugins: [blockchainIqPlugin], settings: { secrets: { BIQ_PRIVATE_KEY: process.env.BIQ_PRIVATE_KEY } } };
```
Settings are read via `runtime.getSetting` first, then the environment.

## Configuration (env only, never commit keys)
| Variable | Purpose |
|---|---|
| `BIQ_PRIVATE_KEY` | Hex private key of a Base wallet holding a little USDC |
| `BIQ_SIGNER_MODULE` | Alternative: path to an ES module exporting a viem `account` (or async factory), e.g. a remote/KMS signer |
| `BIQ_MAX_USD` | Per-call spend cap in dollars (default 0.06) |
| `BIQ_BASE_URL` | Override API base (default `https://www.blockchainiq.co/api/x402/v1`) |

## Make one paid call ($0.01)
```bash
npm install
npm run probe                               # unpaid: shows the 402 price, no signing
BIQ_PRIVATE_KEY=0x... BIQ_CONFIRM_PAID=yes npm run paid-call
```
Prints the brief and the settlement (payer, network, transaction hash) from the `PAYMENT-RESPONSE` header.

## Tests
`npm test` runs against a local mock x402 server plus an unpaid live 402 check (`SKIP_LIVE=1` to skip). No payment is made.

## License
MIT
