"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { getNavForRole } from "@/lib/rbac"
import { useSidebar } from "@/components/dashboard/sidebar-context"
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Settings,
  Building2,
  Clock,
  FileText,
  Bell,
  Fingerprint,
  FolderKanban,
  CheckSquare,
  NotebookPen,
  BarChart3,
  DollarSign,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Employees: Users,
  Projects: FolderKanban,
  "My Tasks": CheckSquare,
  Departments: Building2,
  Attendance: Clock,
  "Check In/Out": Clock,
  "Time Reports": BarChart3,
  Leaves: Calendar,
  "Work Logs": NotebookPen,
  Payroll: DollarSign,
  Performance: ClipboardList,
  Biometric: Fingerprint,
  Documents: FileText,
  Notifications: Bell,
  Settings: Settings,
  Account: UserCircle,
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen, close } = useSidebar()
  const role = session?.user?.role ?? "EMPLOYEE"
  const navigation = getNavForRole(role)

  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, close])

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 border-b border-gray-200 shrink-0">
          <Link href="/dashboard" className="text-lg sm:text-xl font-bold text-gray-900">
            HRMS
          </Link>
          <button
            type="button"
            onClick={close}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto overscroll-contain">
          {navigation.map((item) => {
            const Icon = ICONS[item.name] ?? LayoutDashboard
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-3 sm:p-4 shrink-0">
          <Link
            href="/account"
            onClick={close}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {role.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  )
}
