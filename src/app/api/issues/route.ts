import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notifyIssueAssignment } from "@/lib/issue-notifications"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const status = searchParams.get("status")
    const mine = searchParams.get("mine") === "true"

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (mine && session.user?.id) {
      where.assigneeId = session.user.id
    } else if (assigneeId) {
      where.assigneeId = assigneeId
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true, timeEntries: true } },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    })

    return NextResponse.json(issues)
  } catch (error) {
    console.error("Error fetching issues:", error)
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      dueDate,
      estimatedHours,
      sprintId,
    } = body

    if (!projectId || !title) {
      return NextResponse.json({ error: "Project and title are required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const lastIssue = await prisma.issue.findFirst({
      where: { projectId },
      orderBy: { issueNumber: "desc" },
      select: { issueNumber: true },
    })

    const issueNumber = (lastIssue?.issueNumber ?? 0) + 1

    const issue = await prisma.issue.create({
      data: {
        projectId,
        issueNumber,
        title,
        description,
        type: type || "TASK",
        status: status || "TODO",
        priority: priority || "MEDIUM",
        assigneeId: assigneeId || null,
        reporterId: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        sprintId: sprintId || null,
      },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (assigneeId && assigneeId !== session.user.id) {
      const reporter = await prisma.employee.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      })
      await notifyIssueAssignment({
        assigneeId,
        projectId,
        projectKey: project.key,
        issueId: issue.id,
        issueNumber,
        title,
        assignedByName: reporter
          ? `${reporter.firstName} ${reporter.lastName}`
          : undefined,
      })
    }

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error("Error creating issue:", error)
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 })
  }
}
