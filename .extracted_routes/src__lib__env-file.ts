import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"

const ENV_PATH = path.join(process.cwd(), ".env.local")

export async function updateEnvFile(updates: Record<string, string>) {
  let content = ""
  try {
    content = await readFile(ENV_PATH, "utf-8")
  } catch {
    // create new file
  }

  const lines = content.split("\n").filter((line) => line.trim().length > 0)
  const keys = new Set(Object.keys(updates))

  const kept = lines.filter((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)
    return !match || !keys.has(match[1])
  })

  for (const [key, value] of Object.entries(updates)) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    kept.push(`${key}="${escaped}"`)
  }

  await writeFile(ENV_PATH, kept.join("\n") + "\n", "utf-8")
}

export async function ensureEnvFromExample() {
  const examplePath = path.join(process.cwd(), ".env.example")
  try {
    await readFile(ENV_PATH, "utf-8")
  } catch {
    try {
      const example = await readFile(examplePath, "utf-8")
      await writeFile(ENV_PATH, example, "utf-8")
    } catch {
      await mkdir(path.dirname(ENV_PATH), { recursive: true })
      await writeFile(ENV_PATH, "", "utf-8")
    }
  }
}
