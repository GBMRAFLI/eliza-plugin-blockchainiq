import { probe } from "../src/client.js";
console.log(JSON.stringify(await probe("brief"), null, 2));
