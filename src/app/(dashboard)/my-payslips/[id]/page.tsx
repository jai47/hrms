import { redirect } from "next/navigation"

export default async function MyPaySlipDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/documents/payslips/${id}`)
}
