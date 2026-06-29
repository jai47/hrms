export type Role = "ADMIN" | "HR_MANAGER" | "MANAGER" | "EMPLOYEE"

export const ROLES: Role[] = ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"]

const ROLE_RANK: Record<Role, number> = {
  ADMIN: 4,
  HR_MANAGER: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
}

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role)
}

export function hasMinRole(userRole: string, minRole: Role): boolean {
  const rank = ROLE_RANK[userRole as Role] ?? 0
  return rank >= ROLE_RANK[minRole]
}

export function hasAnyRole(userRole: string, allowed: Role[]): boolean {
  return allowed.some((role) => userRole === role)
}

export function canManageEmployees(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER"])
}

export function canManagePayroll(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER"])
}

export function canManageSettings(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER"])
}

export function canManageBiometric(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER"])
}

export function canApproveLeaves(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER", "MANAGER"])
}

export function canViewAllAttendance(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER", "MANAGER"])
}

export function canViewAllLeaves(role: string): boolean {
  return hasAnyRole(role, ["ADMIN", "HR_MANAGER", "MANAGER"])
}

export type NavItem = {
  name: string
  href: string
  icon: string
  roles: Role[]
}

/** Sidebar routes filtered by role */
export const NAV_ITEMS: Omit<NavItem, "icon">[] = [
  { name: "Dashboard", href: "/dashboard", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Employees", href: "/employees", roles: ["ADMIN", "HR_MANAGER"] },
  { name: "Projects", href: "/projects", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "My Tasks", href: "/tasks", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Departments", href: "/departments", roles: ["ADMIN", "HR_MANAGER"] },
  { name: "Attendance", href: "/attendance/records", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
  { name: "Check In/Out", href: "/attendance/checkin", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Time Reports", href: "/attendance/reports", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
  { name: "Leaves", href: "/leaves", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Payroll", href: "/payroll", roles: ["ADMIN", "HR_MANAGER"] },
  { name: "Performance", href: "/performance", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
  { name: "Biometric", href: "/biometric", roles: ["ADMIN", "HR_MANAGER"] },
  { name: "Documents", href: "/documents", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Notifications", href: "/notifications", roles: ["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"] },
  { name: "Settings", href: "/settings", roles: ["ADMIN", "HR_MANAGER"] },
]

/** Page path → minimum roles allowed (first match wins) */
export const ROUTE_ACCESS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/settings", roles: ["ADMIN", "HR_MANAGER"] },
  { prefix: "/employees", roles: ["ADMIN", "HR_MANAGER"] },
  { prefix: "/payroll", roles: ["ADMIN", "HR_MANAGER"] },
  { prefix: "/biometric", roles: ["ADMIN", "HR_MANAGER"] },
  { prefix: "/departments", roles: ["ADMIN", "HR_MANAGER"] },
  { prefix: "/attendance/records", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
  { prefix: "/attendance/reports", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
  { prefix: "/performance", roles: ["ADMIN", "HR_MANAGER", "MANAGER"] },
]

export function getNavForRole(role: string) {
  return NAV_ITEMS.filter((item) => hasAnyRole(role, item.roles))
}

export function canAccessRoute(role: string, pathname: string): boolean {
  const rule = ROUTE_ACCESS.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
  if (!rule) return true
  return hasAnyRole(role, rule.roles)
}

export function getRouteRoles(pathname: string): Role[] | null {
  const rule = ROUTE_ACCESS.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
  return rule?.roles ?? null
}
