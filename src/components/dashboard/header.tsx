"use client"

import { useEffect, useState, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { LogOut, Bell, Menu, KeyRound, Settings } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useSidebar } from "@/components/dashboard/sidebar-context"
import { canManageSettings } from "@/lib/rbac"

type Notification = {
  id: string
  title: string
  message: string
  link: string | null
  createdAt: string
}

export function Header() {
  const { data: session } = useSession()
  const { toggle } = useSidebar()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const role = session?.user?.role ?? "EMPLOYEE"
  const showSystemSettings = canManageSettings(role)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/notifications?limit=5")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      })
      .catch(() => {})
  }, [session?.user?.id, showNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white shrink-0">
      <div className="flex h-14 sm:h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={toggle}
            className="lg:hidden p-2 -ml-1 rounded-md text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate lg:hidden">
            HRMS
          </h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] sm:text-xs text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border bg-white shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                </div>
                <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "/notifications"}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
                        onClick={() => setShowNotifications(false)}
                      >
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 p-2 text-center">
                  <Link
                    href="/notifications"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm shrink-0">
                {session?.user?.name?.[0] || "U"}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {session?.user?.name || "User"}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-lg border bg-white shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                </div>
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <KeyRound className="h-4 w-4 shrink-0" />
                  Account & Password
                </Link>
                {showSystemSettings && (
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    System Settings
                  </Link>
                )}
                <hr className="my-2 border-gray-200" />
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
