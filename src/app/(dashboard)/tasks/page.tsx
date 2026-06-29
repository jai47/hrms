import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckSquare, Clock, FolderKanban } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { TaskKanbanBoard } from "./client-components"

async function getMyIssues(userId: string) {
  return prisma.issue.findMany({
    where: { assigneeId: userId },
    include: {
      project: { select: { id: true, key: true, name: true } },
      _count: { select: { timeEntries: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  })
}

async function getRecentTimeEntries(userId: string) {
  return prisma.timeEntry.findMany({
    where: { employeeId: userId },
    include: {
      issue: {
        select: {
          issueNumber: true,
          title: true,
          project: { select: { key: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 10,
  })
}

export default async function MyTasksPage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) return null

  const [issues, timeEntries] = await Promise.all([
    getMyIssues(userId),
    getRecentTimeEntries(userId),
  ])

  const openIssues = issues.filter((i) => i.status !== "DONE")
  const totalLogged = timeEntries.reduce((sum, e) => sum + e.hours, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500">Drag tasks between columns to update progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{openIssues.length}</p>
                <p className="text-sm text-gray-500">Open tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{issues.length}</p>
                <p className="text-sm text-gray-500">Total assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalLogged.toFixed(1)}h</p>
                <p className="text-sm text-gray-500">Recent time logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Board</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskKanbanBoard issues={issues} />
        </CardContent>
      </Card>

      {timeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm border-b pb-2">
                  <span>
                    {formatDate(entry.date)}
                    {entry.issue && (
                      <> · {entry.issue.project.key}-{entry.issue.issueNumber}: {entry.issue.title}</>
                    )}
                    {entry.description && <> — {entry.description}</>}
                  </span>
                  <span className="font-medium">{entry.hours}h</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
