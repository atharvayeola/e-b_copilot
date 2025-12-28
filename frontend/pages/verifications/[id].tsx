import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import {
  addTranscript,
  fetchArtifacts,
  fetchAuditEvents,
  fetchReport,
  fetchSummary,
  fetchVerification,
  finalizeVerification,
  runVerification,
  updateSummaryField,
  uploadArtifact,
} from "../../lib/api"
import { cn } from "../../lib/utils"
import { StatusBadge, GlassCard } from "../../components/ModernUI"
import {
  ChevronLeft, Zap, CheckCircle2, FileText, ClipboardList,
  History, ShieldAlert, Upload, Plus, Download, ArrowRight,
  User, Calendar, CreditCard, Activity, Link as LinkIcon
} from "lucide-react"
import { toast } from "sonner"

const tabs = [
  { id: "decision", label: "Decision Suite", icon: Zap },
  { id: "evidence", label: "Clinical Evidence", icon: FileText },
  { id: "report", label: "Final Report", icon: ClipboardList },
  { id: "audit", label: "System Audit", icon: History }
]

export default function VerificationDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [activeTab, setActiveTab] = useState("decision")
  const [verification, setVerification] = useState<any | null>(null)
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldEdits, setFieldEdits] = useState<
    Record<string, { value: string; status: string; note: string }>
  >({})

  const verificationId = useMemo(() => (typeof id === "string" ? id : ""), [id])

  const loadAll = async () => {
    if (!verificationId) return
    setLoading(true)
    try {
      const [verificationData, artifactData, summaryData, auditData] = await Promise.all([
        fetchVerification(verificationId),
        fetchArtifacts(verificationId),
        fetchSummary(verificationId),
        fetchAuditEvents(verificationId),
      ])
      setVerification(verificationData)
      setArtifacts(artifactData)
      setSummary(summaryData)
      setAuditEvents(auditData)

      const nextEdits: Record<string, { value: string; status: string; note: string }> = {}
      summaryData.fields.forEach((field: any) => {
        nextEdits[field.field_name] = {
          value: JSON.stringify(field.value_json, null, 2),
          status: field.status,
          note: field.reviewer_note || "",
        }
      })
      setFieldEdits(nextEdits)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll().catch((err: any) => setError(err.message))
  }, [verificationId])

  const handleRun = async () => {
    if (!verificationId) return
    await runVerification(verificationId)
    await loadAll()
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!verificationId || !event.target.files?.[0]) return
    await uploadArtifact(verificationId, event.target.files[0])
    await loadAll()
  }

  const handleTranscript = async () => {
    if (!verificationId || !transcript.trim()) return
    await addTranscript(verificationId, transcript)
    setTranscript("")
    await loadAll()
  }

  const handleFieldSave = async (fieldName: string) => {
    if (!verificationId) return
    const edit = fieldEdits[fieldName]
    if (!edit) return

    let parsed
    try {
      parsed = JSON.parse(edit.value)
    } catch (err) {
      toast.error("Invalid format", { description: "Field value must be valid JSON" })
      return
    }

    try {
      await updateSummaryField(verificationId, fieldName, {
        status: edit.status,
        value_json: parsed,
        reviewer_note: edit.note,
      })
      toast.success("Node Saved", { description: `${fieldName} updated successfully` })
      await loadAll()
    } catch (e) {
      toast.error("Failed to save")
    }
  }

  const handleApprove = async (fieldName: string) => {
    if (!verificationId) return
    const edit = fieldEdits[fieldName]
    if (!edit) return

    let parsed
    try {
      parsed = JSON.parse(edit.value)
    } catch (err) {
      toast.error("Invalid format", { description: "Field value must be valid JSON" })
      return
    }

    try {
      await updateSummaryField(verificationId, fieldName, {
        status: "approved",
        value_json: parsed,
        reviewer_note: edit.note,
      })
      toast.success("Quick Approved", {
        description: `${fieldName} marked as verified`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      })
      await loadAll()
    } catch (e) {
      toast.error("Failed to approve")
    }
  }

  const handleFinalize = async () => {
    if (!verificationId) return
    try {
      await finalizeVerification(verificationId)
      toast.success("Verification Finalized", {
        description: "Case closed and report generated",
        className: "bg-emerald-50 border-emerald-200"
      })
      await loadAll()
    } catch (e: any) {
      toast.error("Finalize Failed", { description: e.message || "Could not finalize case" })
    }
  }

  const handleGetReport = async () => {
    if (!verificationId) return
    const data = await fetchReport(verificationId)
    setReportUrl(data.download_url)
  }

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing Decision Space...</div>

  if (!verification) return <div className="p-12 text-center text-red-500 font-bold">Case Identifier Mismatch</div>

  return (
    <div className="space-y-10 animate-in-fade">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/worklist")}
            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case ID: {verification.id.slice(0, 8)}</span>
              <StatusBadge status={
                verification.status === 'finalized' ? 'finalized' :
                  verification.status === 'pending' ? 'pending' : 'processing'
              } />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">{verification.patient_info?.patient_name}</h1>
            <p className="text-slate-500 font-medium">{verification.payer_name} · {verification.service_category}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {verification.status === "pending" && (
            <button
              onClick={handleRun}
              className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Run AI Extraction</span>
            </button>
          )}
          {verification.status !== "finalized" && (
            <button
              onClick={handleFinalize}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:bg-black transition-all active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Finalize Review</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in">
          <ShieldAlert className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Metadata Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" />
                Patient Demographics
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Birth Sequence</span>
                  <span className="text-sm font-bold text-slate-900">{verification.patient_info?.date_of_birth}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Contact Channel</span>
                  <span className="text-sm font-bold text-slate-900">{verification.patient_info?.phone || "REDACTED"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                Carrier Context
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Member Identifier</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{verification.insurance_info?.member_id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Subscriber Name</span>
                  <span className="text-sm font-bold text-slate-900">{verification.insurance_info?.subscriber_name || "Self"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                Intended Service
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Class of Care</span>
                  <span className="text-sm font-bold text-slate-900">{verification.service_category}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main workspace */}
        <div className="lg:col-span-9 space-y-8">
          {/* Tab Navigation */}
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                    activeTab === tab.id
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                  )}
                >
                  <Icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-slate-400")} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="animate-in-fade">
            {activeTab === "decision" && (
              <div className="space-y-6">
                {summary?.fields.map((field: any) => (
                  <GlassCard key={field.id} className="p-0 overflow-hidden border-slate-100 hover:border-primary/20 transition-colors shadow-none">
                    <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                            <ShieldAlert className={cn(
                              "w-4 h-4",
                              field.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'
                            )} />
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg">{field.field_name}</h4>
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                            field.confidence > 0.8 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              field.confidence > 0.4 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                "bg-red-50 text-red-600 border border-red-100"
                          )}>
                            {Math.round(field.confidence * 100)}% Match
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Extracted Value</label>
                            <textarea
                              rows={Math.min(5, fieldEdits[field.field_name]?.value.split('\n').length || 2)}
                              value={fieldEdits[field.field_name]?.value || ""}
                              onChange={(e) => setFieldEdits({
                                ...fieldEdits,
                                [field.field_name]: { ...fieldEdits[field.field_name], value: e.target.value }
                              })}
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-64 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Field Status</label>
                          <select
                            value={fieldEdits[field.field_name]?.status || field.status}
                            onChange={(e) => setFieldEdits({
                              ...fieldEdits,
                              [field.field_name]: { ...fieldEdits[field.field_name], status: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer"
                          >
                            <option value="draft">Draft Results</option>
                            <option value="approved">Approved & Linked</option>
                            <option value="edited">Manual Override</option>
                            <option value="unknown">Indeterminate</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Reviewer Audit Note</label>
                          <input
                            value={fieldEdits[field.field_name]?.note || ""}
                            onChange={(e) => setFieldEdits({
                              ...fieldEdits,
                              [field.field_name]: { ...fieldEdits[field.field_name], note: e.target.value }
                            })}
                            placeholder="Clarification..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {field.evidence_ref_json?.artifact_id && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase bg-primary/5 px-2.5 py-1 rounded-lg">
                            <LinkIcon className="w-3 h-3" />
                            Evidence Linked
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {((fieldEdits[field.field_name]?.status || field.status) !== 'approved') && (
                          <button
                            onClick={() => handleApprove(field.field_name)}
                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            Quick Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleFieldSave(field.field_name)}
                          className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:scale-105 transition-all"
                        >
                          Save Node
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {activeTab === "evidence" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GlassCard className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 font-display">Ingest Evidence</h3>
                  <div className="space-y-6">
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden">
                      <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1">Upload Clinical Doc</p>
                      <p className="text-xs text-slate-400">PDF, PNG, JPG (Max 10MB)</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Clinical Transcript / Notes</label>
                      <textarea
                        rows={6}
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Paste IVR transcript or manual portal notes..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                      />
                      <button
                        onClick={handleTranscript}
                        className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                      >
                        Append to Evidence Base
                      </button>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 font-display">Artifact Repository</h3>
                  <div className="space-y-4">
                    {artifacts.length === 0 ? (
                      <div className="p-12 text-center text-slate-300 italic text-sm">No evidence objects cataloged.</div>
                    ) : (
                      artifacts.map((artifact) => (
                        <div key={artifact.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{artifact.filename || "Platform Text Object"}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{artifact.type} · {artifact.source}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (artifact.storage_key) {
                                toast.info("Downloading", { description: `Preparing ${artifact.filename || 'file'} for download...` })
                              } else {
                                toast.info("Text Artifact", { description: "This artifact is stored as text only" })
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "report" && (
              <GlassCard className="max-w-2xl mx-auto text-center py-20 px-10 space-y-8">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 font-display mb-3">Intelligence Report</h3>
                  <p className="text-slate-500">Construct a high-fidelity benefits summary anchored by the AI evidence base.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleGetReport}
                    className="bg-primary text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                  >
                    Generate Final Narrative
                  </button>
                  {reportUrl && (
                    <a
                      href={reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-10 py-4 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Download Clinical Summary
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-8">Proprietary MedOS Analysis Engine v4.2</p>
              </GlassCard>
            )}

            {activeTab === "audit" && (
              <GlassCard className="p-0 overflow-hidden shadow-none border-slate-100">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Event Timestamp</th>
                      <th>Platform Activity</th>
                      <th>Actor Origin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="text-xs font-medium text-slate-500">{new Date(event.created_at).toLocaleString()}</td>
                        <td>
                          <span className="font-bold text-slate-900">{event.event_type}</span>
                        </td>
                        <td>
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                            event.actor_type === 'system' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                          )}>{event.actor_type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
