/** Canonical keys stored in the Settings collection */
export const SETTING_KEYS = {
  companyName: "companyName",
  companyEmail: "companyEmail",
  timezone: "timezone",
  dateFormat: "dateFormat",
  workStartTime: "work_start_time",
  workEndTime: "work_end_time",
  lateThreshold: "late_threshold_minutes",
  earlyLeaveThreshold: "early_leave_threshold_minutes",
  defaultBreakMinutes: "default_break_minutes",
  annualLeaveDays: "annualLeaveDays",
  sickLeaveDays: "sickLeaveDays",
  carryForwardMax: "carryForwardMax",
  emailNotifications: "emailNotifications",
  leaveNotifications: "leaveNotifications",
  attendanceNotifications: "attendanceNotifications",
  performanceNotifications: "performanceNotifications",
} as const

export function uiKeyToDbKey(uiKey: string): string {
  return (SETTING_KEYS as Record<string, string>)[uiKey] ?? uiKey
}

export function dbKeyToUiKey(dbKey: string): string {
  const entry = Object.entries(SETTING_KEYS).find(([, v]) => v === dbKey)
  return entry ? entry[0] : dbKey
}
