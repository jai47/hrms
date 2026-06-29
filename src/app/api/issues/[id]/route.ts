import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notifyIssueAssignment } from "@/lib/issue-notifications"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        timeEntries: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { date: "desc" },
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const totalLoggedHours = issue.timeEntries.reduce((sum, e) => sum + e.hours, 0)

    return NextResponse.json({ ...issue, totalLoggedHours })
  } catch (error) {
    console.error("Error fetching issue:", error)
    return NextResponse.json({ error: "Failed to fetch issue" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.issue.findUnique({
      where: { id },
      include: { project: { select: { key: true, id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const issue = await prisma.issue.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        status: body.status,
        priority: body.priority,
        assigneeId: body.assigneeId === undefined ? undefined : body.assigneeId || null,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
        estimatedHours:
          body.estimatedHours === undefined
            ? undefined
            : body.estimatedHours
              ? parseFloat(body.estimatedHours)
              : null,
        sprintId: body.sprintId === undefined ? undefined : body.sprintId || null,
      },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (
      body.assigneeId &&
      body.assigneeId !== existing.assigneeId &&
      body.assigneeId !== session.user.id
    ) {
      const assigner = await prisma.employee.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      })
      await notifyIssueAssignment({
        assigneeId: body.assigneeId,
        projectId: existing.projectId,
        projectKey: existing.project.key,
        issueId: id,
        issueNumber: existing.issueNumber,
        title: issue.title,
        assignedByName: assigner
          ? `${assigner.firstName} ${assigner.lastName}`
          : undefined,
      })
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error("Error updating issue:", error)
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.issue.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting issue:", error)
    return NextResponse.json({ error: "Failed to delete issue" }, { status: 500 })
  }
}
