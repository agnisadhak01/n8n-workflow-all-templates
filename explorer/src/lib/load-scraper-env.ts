import path from "path";
import { config } from "dotenv";

let loaded = false;

/**
 * Load scripts/scraper/.env into process.env when Supabase credentials
 * are missing (e.g. in local dev so you don't duplicate vars in explorer/.env.local).
 * No-op if SUPABASE_SERVICE_ROLE_KEY is already set or scraper .env doesn't exist.
 */
export function loadScraperEnvIfNeeded(): void {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (loaded) return;

  const scraperEnv = path.join(
    process.cwd(),
    "..",
    "scripts",
    "scraper",
    ".env"
  );
  config({ path: scraperEnv });
  loaded = true;
}
