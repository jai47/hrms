import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import type { LeaveBalance } from "@/lib/leave-balance"

export function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5" />
          Leave Balance ({balance.year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <BalanceBucket
            label="Annual / Casual"
            total={balance.annual.total}
            used={balance.annual.used}
            remaining={balance.annual.remaining}
            color="blue"
          />
          <BalanceBucket
            label="Sick Leave"
            total={balance.sick.total}
            used={balance.sick.used}
            remaining={balance.sick.remaining}
            color="green"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function BalanceBucket({
  label,
  total,
  used,
  remaining,
  color,
}: {
  label: string
  total: number
  used: number
  remaining: number
  color: "blue" | "green"
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const barColor = color === "blue" ? "bg-blue-500" : "bg-green-500"
  const bgColor = color === "blue" ? "bg-blue-100" : "bg-green-100"

  return (
    <div className={`rounded-lg p-4 ${bgColor}`}>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {remaining}
        <span className="text-sm font-normal text-gray-500"> / {total} days</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">{used} used</p>
      <div className="mt-2 h-2 rounded-full bg-white/60 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
