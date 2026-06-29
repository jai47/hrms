import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

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

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, key: true, name: true } },
        issues: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { issueNumber: "asc" },
        },
      },
    })

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
    }

    const backlog = await prisma.issue.findMany({
      where: {
        projectId: sprint.projectId,
        OR: [{ sprintId: null }, { sprintId: { not: sprint.id } }],
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { issueNumber: "desc" },
    })

    return NextResponse.json({ sprint, backlog })
  } catch (error) {
    console.error("Error fetching sprint:", error)
    return NextResponse.json({ error: "Failed to fetch sprint" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.sprint.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
    }

    if (body.status === "ACTIVE") {
      await prisma.sprint.updateMany({
        where: { projectId: existing.projectId, status: "ACTIVE", id: { not: id } },
        data: { status: "PLANNED" },
      })
    }

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        name: body.name,
        goal: body.goal,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
      },
    })

    return NextResponse.json(sprint)
  } catch (error) {
    console.error("Error updating sprint:", error)
    return NextResponse.json({ error: "Failed to update sprint" }, { status: 500 })
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

    await prisma.issue.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    })

    await prisma.sprint.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sprint:", error)
    return NextResponse.json({ error: "Failed to delete sprint" }, { status: 500 })
  }
}
