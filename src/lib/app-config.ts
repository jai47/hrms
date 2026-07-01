import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import path from "path"

/** @deprecated Local file config — S3 settings are stored in the database. */
export type AppConfig = {
  setupComplete: boolean
  mongodbUri?: string
}

const CONFIG_DIR = path.join(process.cwd(), "data")
const CONFIG_PATH = path.join(CONFIG_DIR, "app-config.json")

const DEFAULT_CONFIG: AppConfig = {
  setupComplete: false,
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function readAppConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG }
    const raw = readFileSync(CONFIG_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    return {
      setupComplete: Boolean(parsed.setupComplete),
      mongodbUri: parsed.mongodbUri,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function writeAppConfig(config: AppConfig) {
  try {
    ensureConfigDir()
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8")
  } catch {
    // Read-only filesystem (e.g. Vercel) — ignore local config writes
  }
}

export function needsSetup(): boolean {
  const config = readAppConfig()
  if (config.setupComplete) return false
  if (process.env.DATABASE_URL) return false
  return true
}

export function getEffectiveMongoUri(): string | undefined {
  const config = readAppConfig()
  return config.mongodbUri || process.env.DATABASE_URL
}
