import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import {
  documentFileUrl,
  isPreviewableDocument,
  getDocumentMimeType,
} from "@/lib/documents"
import { canManageEmployees } from "@/lib/rbac"

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeId: true },
      },
    },
  })

  if (!document) notFound()

  const role = session?.user?.role ?? "EMPLOYEE"
  const canView =
    canManageEmployees(role) ||
    role === "MANAGER" ||
    document.employeeId === session?.user?.id

  if (!canView) notFound()

  const fileUrl = documentFileUrl(document.id)
  const downloadUrl = `${fileUrl}?download=1`
  const previewable = isPreviewableDocument(document.fileUrl)
  const mimeType = getDocumentMimeType(document.fileUrl)
  const isImage = mimeType.startsWith("image/")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/documents" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <p className="text-gray-500">
              {document.employee.firstName} {document.employee.lastName} · Uploaded{" "}
              {formatDate(document.uploadedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={downloadUrl}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Preview</CardTitle>
            <Badge>{document.type.replace("_", " ")}</Badge>
            <Badge variant="secondary">{document.status.replace("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!previewable ? (
            <div className="text-center py-16 text-gray-500">
              <p>Preview not available for this file type.</p>
              <a href={downloadUrl} className="text-primary hover:underline mt-2 inline-block">
                Download to view
              </a>
            </div>
          ) : isImage ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={document.title}
                className="max-w-full max-h-[70vh] rounded-lg border"
              />
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title={document.title}
              className="w-full h-[70vh] rounded-lg border"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
