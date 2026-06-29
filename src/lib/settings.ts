import { prisma } from "@/lib/prisma"

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await prisma.settings.findMany()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function upsertSetting(key: string, value: string, description?: string) {
  return prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value, description },
  })
}

export async function upsertSettings(entries: Record<string, string>) {
  await Promise.all(
    Object.entries(entries).map(([key, value]) => upsertSetting(key, value))
  )
}
