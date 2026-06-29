"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { WorkLogReminderBanner } from "@/components/dashboard/work-log-reminder-banner"
import { SidebarProvider } from "@/components/dashboard/sidebar-context"
import { canAccessRoute } from "@/lib/rbac"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      if (!canAccessRoute(session.user.role, pathname)) {
        router.replace("/dashboard?error=access_denied")
      }
    }
  }, [status, session, pathname, router])

  if (status === "loading") {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <WorkLogReminderBanner />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
