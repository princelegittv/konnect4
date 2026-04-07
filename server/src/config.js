import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = Number(process.env.PORT ?? 3001);
export const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
export const APP_NAME = "Konnect4";
export const SESSION_COOKIE_NAME = "konnect4_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const defaultDataDirectory =
  process.env.NODE_ENV === "test" ? path.resolve(__dirname, "../data-test") : path.resolve(__dirname, "../data");

export const DATA_DIRECTORY = process.env.KONNECT4_DATA_DIRECTORY ?? defaultDataDirectory;
export const DATABASE_FILE =
  process.env.KONNECT4_DATABASE_FILE ?? path.join(DATA_DIRECTORY, "konnect4.sqlite");
