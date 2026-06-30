"use client"

import { useEffect, useState } from "react"
import { Megaphone, X } from "lucide-react"
import Link from "next/link"

type Announcement = {
  id: string
  title: string
  content: string
  priority: string
}

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => setAnnouncements([]))
  }, [])

  const visible = announcements.filter(
    (a) => a.priority === "HIGH" || a.priority === "URGENT"
  ).filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  const top = visible[0]

  return (
    <div
      className={`px-3 sm:px-4 py-2 text-sm flex items-center gap-3 shrink-0 ${
        top.priority === "URGENT"
          ? "bg-red-50 border-b border-red-200 text-red-900"
          : "bg-amber-50 border-b border-amber-200 text-amber-900"
      }`}
    >
      <Megaphone className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{top.title}</span>
        <span className="hidden sm:inline text-current/80"> — {top.content.slice(0, 120)}{top.content.length > 120 ? "…" : ""}</span>
        <Link href="/announcements" className="ml-2 underline hover:no-underline">
          Read more
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed((prev) => new Set([...prev, top.id]))}
        className="p-1 rounded hover:bg-black/5 shrink-0"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
