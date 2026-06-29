import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: sprintId } = await params
    const body = await request.json()
    const { issueId, action } = body

    if (!issueId || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "issueId and action (add|remove) are required" },
        { status: 400 }
      )
    }

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
    }

    const issue = await prisma.issue.findUnique({ where: { id: issueId } })
    if (!issue || issue.projectId !== sprint.projectId) {
      return NextResponse.json({ error: "Issue not found in this project" }, { status: 404 })
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: { sprintId: action === "add" ? sprintId : null },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating sprint issues:", error)
    return NextResponse.json({ error: "Failed to update sprint issues" }, { status: 500 })
  }
}
