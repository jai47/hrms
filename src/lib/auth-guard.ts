import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccessRoute, hasAnyRole, type Role } from "@/lib/rbac"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  return session
}

export async function requireRoles(allowed: Role[]) {
  const session = await requireAuth()
  if (!hasAnyRole(session.user.role, allowed)) {
    redirect("/dashboard?error=access_denied")
  }
  return session
}

export async function requireRouteAccess(pathname: string) {
  const session = await requireAuth()
  if (!canAccessRoute(session.user.role, pathname)) {
    redirect("/dashboard?error=access_denied")
  }
  return session
}
