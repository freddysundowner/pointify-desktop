import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "server", ".env"),
  path.resolve(path.dirname(process.argv[1]), "..", ".env"),
  path.resolve(path.dirname(process.argv[1]), ".env"),
];
const envPath = envCandidates.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath, override: true });
  console.log(`✅ Loaded .env from: ${envPath}`);
} else {
  console.warn(`⚠️  No .env file found. Checked: ${envCandidates.join(", ")}`);
}
