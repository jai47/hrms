"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Cloud, Check } from "lucide-react"

type IntegrationConfig = {
  documentStorageEnabled: boolean
  s3Configured: boolean
  canUploadDocuments: boolean
  s3: {
    bucket: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    prefix: string
  }
}

export function IntegrationsSettings() {
  const [config, setConfig] = useState<IntegrationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [documentStorageEnabled, setDocumentStorageEnabled] = useState(false)
  const [s3, setS3] = useState({
    bucket: "",
    region: "",
    accessKeyId: "",
    secretAccessKey: "",
    endpoint: "",
    prefix: "documents",
  })

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json()
      })
      .then((data: IntegrationConfig) => {
        setConfig(data)
        setDocumentStorageEnabled(data.documentStorageEnabled)
        setS3(data.s3)
      })
      .catch(() => setError("Failed to load integration settings"))
      .finally(() => setLoading(false))
  }, [])

  const updateS3 = (key: string, value: string) => {
    setS3((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const response = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentStorageEnabled, s3 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to save")
      setConfig(data.config)
      setS3(data.config.s3)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Document Storage (S3)
        </CardTitle>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Saved
            </>
          ) : (
            "Save"
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={documentStorageEnabled}
            onChange={(e) => {
              setDocumentStorageEnabled(e.target.checked)
              setSaved(false)
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium">Enable document storage (S3)</span>
        </label>

        {config && (
          <p className="text-xs text-gray-500">
            Status:{" "}
            {config.canUploadDocuments
              ? "Uploads enabled"
              : documentStorageEnabled
                ? "Configure S3 fields below and save"
                : "Document uploads hidden — payslips still work"}
          </p>
        )}

        {documentStorageEnabled && (
        <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label>Bucket</Label>
            <Input value={s3.bucket} onChange={(e) => updateS3("bucket", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Input value={s3.region} onChange={(e) => updateS3("region", e.target.value)} placeholder="us-east-1" />
          </div>
          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input value={s3.accessKeyId} onChange={(e) => updateS3("accessKeyId", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input
              type="password"
              value={s3.secretAccessKey}
              onChange={(e) => updateS3("secretAccessKey", e.target.value)}
              placeholder="Leave blank to keep existing"
            />
          </div>
          <div className="space-y-2">
            <Label>Endpoint (optional)</Label>
            <Input
              value={s3.endpoint}
              onChange={(e) => updateS3("endpoint", e.target.value)}
              placeholder="For MinIO / compatible storage"
            />
          </div>
          <div className="space-y-2">
            <Label>Key Prefix</Label>
            <Input value={s3.prefix} onChange={(e) => updateS3("prefix", e.target.value)} />
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
