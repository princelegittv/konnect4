import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataTestDirectory = path.resolve(__dirname, "../server/data-test");

fs.rmSync(dataTestDirectory, { recursive: true, force: true });
fs.mkdirSync(dataTestDirectory, { recursive: true });

console.log(`Reset test database directory: ${dataTestDirectory}`);
