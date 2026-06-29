"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy, Loader2, RefreshCw } from "lucide-react"

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 text-xs bg-gray-100 border rounded px-3 py-2 break-all">{value}</code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function GoogleFormSetupCard({
  deviceDbId,
  deviceId,
  webhookUrl,
  webhookSecret,
  appsScript,
  googleFormUrl,
}: {
  deviceDbId: string
  deviceId: string
  webhookUrl: string
  webhookSecret: string
  appsScript: string
  googleFormUrl?: string | null
}) {
  const [scriptCopied, setScriptCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [secret, setSecret] = useState(webhookSecret)

  const copyScript = async () => {
    await navigator.clipboard.writeText(appsScript.replace(webhookSecret, secret))
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 2000)
  }

  const regenerateSecret = async () => {
    if (!confirm("Regenerate webhook secret? You must update your Google Apps Script.")) return
    setRegenerating(true)
    try {
      const res = await fetch(`/api/biometric/devices/${deviceDbId}/regenerate-secret`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok && data.webhookSecret) {
        setSecret(data.webhookSecret)
      } else {
        alert(data.error || "Failed to regenerate secret")
      }
    } catch {
      alert("Failed to regenerate secret")
    } finally {
      setRegenerating(false)
    }
  }

  const currentScript = appsScript.replace(webhookSecret, secret)

  return (
    <div className="space-y-4">
      <CopyField label="Webhook URL" value={webhookUrl} />
      <CopyField label="Device ID" value={deviceId} />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Webhook Secret</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerateSecret}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </>
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-gray-100 border rounded px-3 py-2 break-all">{secret}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(secret)
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {googleFormUrl && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Google Form</p>
          <a
            href={googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {googleFormUrl}
          </a>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Google Apps Script</p>
          <Button type="button" variant="outline" size="sm" onClick={copyScript}>
            {scriptCopied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy Script
              </>
            )}
          </Button>
        </div>
        <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto max-h-64">
          {currentScript}
        </pre>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
          <li>Start HRMS locally (<code className="text-xs bg-gray-100 px-1 rounded">docker compose up</code> or <code className="text-xs bg-gray-100 px-1 rounded">npm run dev</code>)</li>
          <li>Run tunnel: <code className="text-xs bg-gray-100 px-1 rounded">cloudflared tunnel --url http://127.0.0.1:3000</code> (use 127.0.0.1, not localhost)</li>
          <li>Open your form&apos;s linked Google Sheet → Extensions → Apps Script</li>
          <li>Paste the script and save</li>
          <li>Add trigger: function <code className="text-xs bg-gray-100 px-1 rounded">onFormSubmit</code> (not myFunction), event <strong>On form submit</strong></li>
          <li>Authorize the script when prompted</li>
        </ol>
      </div>
    </div>
  )
}
