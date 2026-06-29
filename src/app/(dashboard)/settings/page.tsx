import { prisma } from "@/lib/prisma"
import { getSettingsMap } from "@/lib/settings"
import { SettingsForm } from "./client-components"
import { requireRoles } from "@/lib/auth-guard"

async function getCounts() {
  const [employees, departments, devices] = await Promise.all([
    prisma.employee.count(),
    prisma.department.count(),
    prisma.biometricDevice.count(),
  ])
  return { employees, departments, devices }
}

export default async function SettingsPage() {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const [settingsMap, counts] = await Promise.all([getSettingsMap(), getCounts()])

  return <SettingsForm initialDbSettings={settingsMap} counts={counts} />
}
