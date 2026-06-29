import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10", 10) || 10
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const period = searchParams.get("period") || ""
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search } } },
        { employee: { lastName: { contains: search } } },
        { employee: { employeeId: { contains: search } } },
        { reviewPeriod: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (period) {
      where.reviewPeriod = period
    }

    const [reviews, total] = await Promise.all([
      prisma.performance.findMany({
        where,
        include: {
          employee: true,
          reviewer: true,
        },
        skip,
        take: limit,
        orderBy: { reviewDate: "desc" },
      }),
      prisma.performance.count({ where }),
    ])

    return NextResponse.json({
      reviews,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching performance reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch performance reviews" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, reviewPeriod, reviewDate, reviewerId, overallRating, goals, achievements, strengths, improvements, comments, status, kpis } = body

    if (!employeeId || !reviewPeriod || !reviewDate || !reviewerId || !overallRating || !kpis || !kpis.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const performance = await prisma.performance.create({
      data: {
        employeeId,
        reviewPeriod,
        reviewDate: new Date(reviewDate),
        reviewerId,
        overallRating,
        goals,
        achievements,
        strengths,
        improvements,
        comments,
        status: status || "DRAFT",
        kpis: {
          create: kpis.map((kpi: any) => ({
            name: kpi.name,
            target: kpi.target,
            actual: kpi.actual,
            weight: kpi.weight || 1,
            rating: kpi.rating,
          })),
        },
      },
      include: {
        employee: true,
        reviewer: true,
        kpis: true,
      },
    })

    return NextResponse.json(performance, { status: 201 })
  } catch (error) {
    console.error("Error creating performance review:", error)
    return NextResponse.json(
      { error: "Failed to create performance review" },
      { status: 500 }
    )
  }
}