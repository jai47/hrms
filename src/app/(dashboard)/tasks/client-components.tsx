"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ISSUE_STATUSES, formatIssueKey } from "@/lib/projects"
import { getIssuePriorityColor, getIssueTypeColor } from "@/lib/utils"
import { GripVertical } from "lucide-react"

type TaskIssue = {
  id: string
  issueNumber: number
  title: string
  type: string
  status: string
  priority: string
  project: { id: string; key: string; name: string }
}

const statusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
}

function TaskCard({
  issue,
  isDragging,
  onDragStart,
}: {
  issue: TaskIssue
  isDragging: boolean
  onDragStart: (e: React.DragEvent, issueId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue.id)}
      className={`bg-white rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50 border-primary scale-95" : "border-gray-200 hover:border-gray-300 hover:shadow"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-500 mb-1">
            {formatIssueKey(issue.project.key, issue.issueNumber)}
          </p>
          <Link
            href={`/projects/${issue.project.id}/issues/${issue.id}`}
            className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 block hover:text-primary"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          >
            {issue.title}
          </Link>
          <div className="flex flex-wrap gap-1">
            <Badge className={getIssueTypeColor(issue.type)}>{issue.type}</Badge>
            <Badge className={getIssuePriorityColor(issue.priority)}>{issue.priority}</Badge>
          </div>
          <p className="text-xs text-gray-400 mt-2 truncate">{issue.project.name}</p>
        </div>
      </div>
    </div>
  )
}

export function TaskKanbanBoard({ issues: initialIssues }: { issues: TaskIssue[] }) {
  const router = useRouter()
  const [issues, setIssues] = useState(initialIssues)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/issue-id", issueId)
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(issueId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(status)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: string) => {
      e.preventDefault()
      setDropTarget(null)
      setDraggingId(null)

      const issueId = e.dataTransfer.getData("text/issue-id")
      if (!issueId) return

      const issue = issues.find((i) => i.id === issueId)
      if (!issue || issue.status === newStatus) return

      const previous = issues
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      )
      setSaving(true)

      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!response.ok) {
          setIssues(previous)
        } else {
          router.refresh()
        }
      } catch {
        setIssues(previous)
      } finally {
        setSaving(false)
      }
    },
    [issues, router]
  )

  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No tasks assigned to you yet.</p>
        <Link href="/projects" className="inline-block mt-4 text-primary hover:underline">
          Browse Projects
        </Link>
      </div>
    )
  }

  return (
    <div>
      {saving && <p className="text-xs text-gray-500 mb-2">Updating status...</p>}
      <p className="text-xs text-gray-500 mb-3">
        Drag tasks between columns to update progress
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {ISSUE_STATUSES.map((status) => {
          const columnIssues = issues.filter((i) => i.status === status)
          const isTarget = dropTarget === status
          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, status)}
              onDragEnd={handleDragEnd}
              className={`rounded-lg p-3 min-w-[220px] min-h-[160px] transition-colors ${
                isTarget ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{statusLabels[status]}</h3>
                <Badge variant="secondary" className="text-xs">
                  {columnIssues.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {columnIssues.map((issue) => (
                  <TaskCard
                    key={issue.id}
                    issue={issue}
                    isDragging={draggingId === issue.id}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
