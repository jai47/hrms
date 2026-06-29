import { calculateWorkHours } from "@/lib/utils"
import { getSetting } from "@/lib/settings"
import { SETTING_KEYS } from "@/lib/settings-keys"

export async function getDefaultBreakMinutes(): Promise<number> {
  const value = await getSetting(SETTING_KEYS.defaultBreakMinutes)
  const parsed = value ? parseInt(value, 10) : 60
  return Number.isNaN(parsed) ? 60 : parsed
}

export function computeTotalHours(
  checkIn: Date,
  checkOut: Date,
  breakMinutes: number
): number {
  const gross = calculateWorkHours(checkIn, checkOut)
  const net = gross - breakMinutes / 60
  return Math.max(0, Math.round(net * 100) / 100)
}

export async function resolveBreakMinutes(existingBreak?: number | null): Promise<number> {
  if (existingBreak != null && existingBreak > 0) return existingBreak
  return getDefaultBreakMinutes()
}

export async function buildCheckoutUpdate(
  checkIn: Date,
  checkOut: Date,
  breakMinutes?: number | null
) {
  const breakMins = await resolveBreakMinutes(breakMinutes)
  return {
    checkOut,
    totalHours: computeTotalHours(checkIn, checkOut, breakMins),
    breakMinutes: breakMins,
  }
}

export function getAttendanceHours(record: {
  checkIn: Date | null
  checkOut: Date | null
  totalHours: number | null
  breakMinutes?: number | null
}): number | null {
  if (record.totalHours != null) return record.totalHours
  if (record.checkIn && record.checkOut) {
    const gross = calculateWorkHours(record.checkIn, record.checkOut)
    const breakMins = record.breakMinutes ?? 0
    return Math.max(0, Math.round((gross - breakMins / 60) * 100) / 100)
  }
  return null
}
