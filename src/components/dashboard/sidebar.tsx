"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getNavForRole } from "@/lib/rbac"
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
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? "EMPLOYEE"
  const navigation = getNavForRole(role)

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 lg:static lg:inset-0">
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
        <Link href="/dashboard" className="text-xl font-bold text-gray-900">
          HRMS
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = ICONS[item.name] ?? LayoutDashboard
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
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
        </div>
      </div>
    </aside>
  )
}
