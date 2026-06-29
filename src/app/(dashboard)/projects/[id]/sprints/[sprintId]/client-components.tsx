"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { formatIssueKey } from "@/lib/projects"
import { getIssuePriorityColor, getIssueTypeColor } from "@/lib/utils"
import { GripVertical } from "lucide-react"

type Issue = {
  id: string
  issueNumber: number
  title: string
  type: string
  status: string
  priority: string
  assignee: { firstName: string; lastName: string } | null
}

function DraggableIssue({
  issue,
  projectId,
  projectKey,
  onDragStart,
  isDragging,
}: {
  issue: Issue
  projectId: string
  projectKey: string
  onDragStart: (e: React.DragEvent, issueId: string) => void
  isDragging: boolean
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue.id)}
      className={`flex items-start gap-2 bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 border-primary" : "border-gray-200"
      }`}
    >
      <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <Link
          href={`/projects/${projectId}/issues/${issue.id}`}
          className="text-xs font-mono text-gray-500 hover:underline"
          draggable={false}
        >
          {formatIssueKey(projectKey, issue.issueNumber)}
        </Link>
        <p className="text-sm font-medium text-gray-900 mt-1">{issue.title}</p>
        <div className="flex gap-1 mt-2">
          <Badge className={getIssueTypeColor(issue.type)}>{issue.type}</Badge>
          <Badge className={getIssuePriorityColor(issue.priority)}>{issue.priority}</Badge>
        </div>
      </div>
    </div>
  )
}

export function SprintPlanningBoard({
  sprintId,
  projectId,
  projectKey,
  sprintIssues: initialSprintIssues,
  backlogIssues: initialBacklog,
}: {
  sprintId: string
  projectId: string
  projectKey: string
  sprintIssues: Issue[]
  backlogIssues: Issue[]
}) {
  const router = useRouter()
  const [sprintIssues, setSprintIssues] = useState(initialSprintIssues)
  const [backlogIssues, setBacklogIssues] = useState(initialBacklog)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropZone, setDropZone] = useState<"sprint" | "backlog" | null>(null)

  useEffect(() => {
    setSprintIssues(initialSprintIssues)
    setBacklogIssues(initialBacklog)
  }, [initialSprintIssues, initialBacklog])

  const findIssue = (id: string) =>
    sprintIssues.find((i) => i.id === id) || backlogIssues.find((i) => i.id === id)

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/issue-id", issueId)
    setDraggingId(issueId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropZone(null)
  }

  const moveIssue = async (issueId: string, action: "add" | "remove") => {
    const issue = findIssue(issueId)
    if (!issue) return

    const prevSprint = sprintIssues
    const prevBacklog = backlogIssues

    if (action === "add") {
      setBacklogIssues((b) => b.filter((i) => i.id !== issueId))
      setSprintIssues((s) => [...s, issue])
    } else {
      setSprintIssues((s) => s.filter((i) => i.id !== issueId))
      setBacklogIssues((b) => [...b, issue])
    }

    try {
      const response = await fetch(`/api/sprints/${sprintId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, action }),
      })
      if (!response.ok) {
        setSprintIssues(prevSprint)
        setBacklogIssues(prevBacklog)
      } else {
        router.refresh()
      }
    } catch {
      setSprintIssues(prevSprint)
      setBacklogIssues(prevBacklog)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent, zone: "sprint" | "backlog") => {
      e.preventDefault()
      setDropZone(null)
      const issueId = e.dataTransfer.getData("text/issue-id")
      setDraggingId(null)
      if (!issueId) return

      const inSprint = sprintIssues.some((i) => i.id === issueId)
      if (zone === "sprint" && !inSprint) moveIssue(issueId, "add")
      if (zone === "backlog" && inSprint) moveIssue(issueId, "remove")
    },
    [sprintIssues]
  )

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDropZone("backlog")
        }}
        onDragLeave={() => setDropZone(null)}
        onDrop={(e) => handleDrop(e, "backlog")}
        className={`rounded-lg p-4 min-h-[300px] ${
          dropZone === "backlog" ? "bg-orange-50 ring-2 ring-orange-300" : "bg-gray-100"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Backlog</h3>
          <Badge variant="secondary">{backlogIssues.length}</Badge>
        </div>
        <p className="text-xs text-gray-500 mb-3">Drag issues into the sprint →</p>
        <div className="space-y-2" onDragEnd={handleDragEnd}>
          {backlogIssues.map((issue) => (
            <DraggableIssue
              key={issue.id}
              issue={issue}
              projectId={projectId}
              projectKey={projectKey}
              onDragStart={handleDragStart}
              isDragging={draggingId === issue.id}
            />
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDropZone("sprint")
        }}
        onDragLeave={() => setDropZone(null)}
        onDrop={(e) => handleDrop(e, "sprint")}
        className={`rounded-lg p-4 min-h-[300px] ${
          dropZone === "sprint" ? "bg-blue-50 ring-2 ring-blue-300" : "bg-blue-50/50"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Sprint</h3>
          <Badge variant="info">{sprintIssues.length}</Badge>
        </div>
        <p className="text-xs text-gray-500 mb-3">Drop issues here to add to sprint</p>
        <div className="space-y-2" onDragEnd={handleDragEnd}>
          {sprintIssues.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Drop issues here</p>
          ) : (
            sprintIssues.map((issue) => (
              <DraggableIssue
                key={issue.id}
                issue={issue}
                projectId={projectId}
                projectKey={projectKey}
                onDragStart={handleDragStart}
                isDragging={draggingId === issue.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
