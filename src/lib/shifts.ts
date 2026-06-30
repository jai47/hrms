import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { SETTING_KEYS } from "@/lib/settings-keys"

export type EmployeeWorkTimes = {
  startTime: string
  endTime: string
  shiftName: string | null
  source: "shift" | "settings"
}

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export async function getActiveShiftForEmployee(employeeId: string, date = new Date()) {
  const dayCode = DAY_CODES[date.getDay()]
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      startDate: { lte: date },
      OR: [{ endDate: null }, { endDate: { gte: date } }],
    },
    include: { shift: true },
    orderBy: { startDate: "desc" },
  })

  for (const assignment of assignments) {
    if (!assignment.shift.isActive) continue
    try {
      const workingDays: string[] = JSON.parse(assignment.shift.workingDays)
      if (workingDays.includes(dayCode)) {
        return assignment.shift
      }
    } catch {
      return assignment.shift
    }
  }

  return null
}

export async function getEmployeeWorkTimes(
  employeeId: string,
  date = new Date()
): Promise<EmployeeWorkTimes> {
  const shift = await getActiveShiftForEmployee(employeeId, date)
  if (shift) {
    return {
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftName: shift.name,
      source: "shift",
    }
  }

  const [startTime, endTime] = await Promise.all([
    getSetting(SETTING_KEYS.workStartTime),
    getSetting(SETTING_KEYS.workEndTime),
  ])

  return {
    startTime: startTime || "09:00",
    endTime: endTime || "17:00",
    shiftName: null,
    source: "settings",
  }
}

export function parseWorkingDays(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return ["MON", "TUE", "WED", "THU", "FRI"]
  }
}
