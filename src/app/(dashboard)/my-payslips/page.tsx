import { redirect } from "next/navigation"

export default function MyPaySlipsRedirect() {
  redirect("/documents?tab=payslips")
}
