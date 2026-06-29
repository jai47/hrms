"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@/lib/projects"
import { formatDate, formatDateTime } from "@/lib/utils"

type Comment = {
  id: string
  content: string
  createdAt: string
  author: { firstName: string; lastName: string }
}

type TimeEntry = {
  id: string
  date: string
  hours: number
  description: string | null
  employee: { firstName: string; lastName: string }
}

type Employee = { id: string; firstName: string; lastName: string }

export function IssueDetailClient({
  issueId,
  projectId,
  initial,
}: {
  issueId: string
  projectId: string
  initial: {
    title: string
    description: string | null
    type: string
    status: string
    priority: string
    assigneeId: string | null
    dueDate: string | null
    estimatedHours: number | null
    comments: Comment[]
    timeEntries: TimeEntry[]
    totalLoggedHours: number
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description || "")
  const [type, setType] = useState(initial.type)
  const [status, setStatus] = useState(initial.status)
  const [priority, setPriority] = useState(initial.priority)
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId || "")
  const [comment, setComment] = useState("")
  const [logHours, setLogHours] = useState("")
  const [logDescription, setLogDescription] = useState("")
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [saving, setSaving] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [loggingTime, setLoggingTime] = useState(false)

  const loadEmployees = () => {
    if (employees.length) return
    fetch("/api/employees?limit=100")
      .then((r) => r.json())
      .then((data) => setEmployees(data.employees || []))
  }

  const saveIssue = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          status,
          priority,
          assigneeId: assigneeId || null,
        }),
      })
      if (response.ok) router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setPostingComment(true)
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      })
      if (response.ok) {
        setComment("")
        router.refresh()
      }
    } finally {
      setPostingComment(false)
    }
  }

  const logTime = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingTime(true)
    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId,
          date: logDate,
          hours: logHours,
          description: logDescription,
        }),
      })
      if (response.ok) {
        setLogHours("")
        setLogDescription("")
        router.refresh()
      } else {
        const err = await response.json()
        alert(err.error || "Failed to log time")
      }
    } finally {
      setLoggingTime(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </div>
          <Button onClick={saveIssue} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Comments</h3>
          <div className="space-y-3 mb-4">
            {initial.comments.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet</p>
            ) : (
              initial.comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {c.author.firstName} {c.author.lastName}
                    <span className="text-gray-400 font-normal ml-2">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={postComment} className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
            <Button type="submit" size="sm" disabled={postingComment}>
              {postingComment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Comment
            </Button>
          </form>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Time Logged</h3>
          <p className="text-sm text-gray-500 mb-3">
            Total: {initial.totalLoggedHours.toFixed(1)}h
            {initial.estimatedHours != null && ` / ${initial.estimatedHours}h estimated`}
          </p>
          <div className="space-y-2 mb-4">
            {initial.timeEntries.map((entry) => (
              <div key={entry.id} className="flex justify-between items-center text-sm bg-gray-50 rounded p-2 gap-2">
                <span>
                  {formatDate(entry.date)} — {entry.employee.firstName} {entry.employee.lastName}
                  {entry.description && `: ${entry.description}`}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium">{entry.hours}h</span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={async () => {
                      if (!confirm("Delete this time entry?")) return
                      const res = await fetch(`/api/time-entries/${entry.id}`, { method: "DELETE" })
                      if (res.ok) router.refresh()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={logTime} className="space-y-3 border rounded-lg p-4">
            <p className="text-sm font-medium">Log time on this issue</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  required
                />
              </div>
            </div>
            <Input
              placeholder="What did you work on?"
              value={logDescription}
              onChange={(e) => setLogDescription(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={loggingTime}>
              {loggingTime && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Time
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4 space-y-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISSUE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISSUE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={assigneeId || "unassigned"}
              onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
              onOpenChange={(open) => open && loadEmployees()}
            >
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveIssue} className="w-full" disabled={saving}>
            Update Issue
          </Button>
        </div>
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" className="w-full">Back to Board</Button>
        </Link>
      </div>
    </div>
  )
}
