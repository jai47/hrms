"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=50")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, isRead: true } : x)))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Your alerts and updates</p>
        </div>
        <Button variant="outline" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark all read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No notifications yet</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 py-4 ${!n.isRead ? "bg-blue-50/50 -mx-4 px-4 rounded" : ""}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{n.title}</p>
                      {!n.isRead && <Badge variant="info">New</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    {n.link && (
                      <Link href={n.link} className="text-sm text-primary hover:underline mt-1 inline-block">
                        View details →
                      </Link>
                    )}
                  </div>
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
