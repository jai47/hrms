import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: issueId } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const issue = await prisma.issue.findUnique({ where: { id: issueId } })
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const comment = await prisma.issueComment.create({
      data: {
        issueId,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
