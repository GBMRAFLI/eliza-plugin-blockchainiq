// One paid call to `brief` ($0.01). Requires BIQ_PRIVATE_KEY or BIQ_SIGNER_MODULE.
import { getBrief } from "../src/client.js";
if (process.env.BIQ_CONFIRM_PAID !== "yes") { console.error("Refusing: set BIQ_CONFIRM_PAID=yes to spend $0.01"); process.exit(2); }
const { data, settlement } = await getBrief();
console.log(JSON.stringify(data, null, 2));
console.log("SETTLEMENT", JSON.stringify(settlement));
