import { prisma } from "@/lib/prisma"
import { getSettingsMap } from "@/lib/settings"
import { SETTING_KEYS } from "@/lib/settings-keys"

const BALANCE_LEAVE_TYPES: Record<string, "annual" | "sick" | null> = {
  ANNUAL: "annual",
  CASUAL: "annual",
  COMPENSATORY: "annual",
  SICK: "sick",
}

export type LeaveBalance = {
  annual: { total: number; used: number; remaining: number }
  sick: { total: number; used: number; remaining: number }
  year: number
}

function yearBounds(year: number) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59),
  }
}

export async function getLeaveBalances(
  employeeId: string,
  year = new Date().getFullYear()
): Promise<LeaveBalance> {
  const settings = await getSettingsMap()
  const annualTotal = parseInt(settings[SETTING_KEYS.annualLeaveDays] || "21", 10) || 21
  const sickTotal = parseInt(settings[SETTING_KEYS.sickLeaveDays] || "10", 10) || 10
  const { start, end } = yearBounds(year)

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { leaveType: true, totalDays: true },
  })

  let annualUsed = 0
  let sickUsed = 0

  for (const leave of approvedLeaves) {
    const bucket = BALANCE_LEAVE_TYPES[leave.leaveType]
    if (bucket === "annual") annualUsed += leave.totalDays
    else if (bucket === "sick") sickUsed += leave.totalDays
  }

  return {
    year,
    annual: {
      total: annualTotal,
      used: annualUsed,
      remaining: Math.max(0, annualTotal - annualUsed),
    },
    sick: {
      total: sickTotal,
      used: sickUsed,
      remaining: Math.max(0, sickTotal - sickUsed),
    },
  }
}

export function getBalanceBucket(leaveType: string): "annual" | "sick" | null {
  return BALANCE_LEAVE_TYPES[leaveType] ?? null
}

export async function validateLeaveBalance(
  employeeId: string,
  leaveType: string,
  requestedDays: number
): Promise<{ ok: boolean; error?: string }> {
  const bucket = getBalanceBucket(leaveType)
  if (!bucket) return { ok: true }

  const balances = await getLeaveBalances(employeeId)
  const remaining = bucket === "annual" ? balances.annual.remaining : balances.sick.remaining

  if (requestedDays > remaining) {
    const label = bucket === "annual" ? "annual/casual" : "sick"
    return {
      ok: false,
      error: `Insufficient ${label} leave balance. You have ${remaining} day(s) remaining but requested ${requestedDays}.`,
    }
  }

  return { ok: true }
}
