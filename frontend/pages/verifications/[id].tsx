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

const tabs = ["overview", "evidence", "review", "report", "audit"]

export default function VerificationDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [activeTab, setActiveTab] = useState("overview")
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
    setLoading(false)
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message))
  }, [verificationId])

  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("auth_tokens")) {
      router.push("/")
    }
  }, [router])

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
    let parsed
    try {
      parsed = JSON.parse(edit.value)
    } catch (err) {
      setError("Value must be valid JSON")
      return
    }
    await updateSummaryField(verificationId, fieldName, {
      status: edit.status,
      value_json: parsed,
      reviewer_note: edit.note,
    })
    await loadAll()
  }

  const handleApprove = async (fieldName: string) => {
    const field = summary?.fields.find((item: any) => item.field_name === fieldName)
    if (!field || !verificationId) return
    await updateSummaryField(verificationId, fieldName, {
      status: "approved",
      value_json: field.value_json,
      reviewer_note: field.reviewer_note || "",
    })
    await loadAll()
  }

  const handleUnknown = async (fieldName: string) => {
    if (!verificationId) return
    await updateSummaryField(verificationId, fieldName, {
      status: "unknown",
      value_json: "unknown",
      reviewer_note: "Set to unknown during review",
    })
    await loadAll()
  }

  const handleFinalize = async () => {
    if (!verificationId) return
    await finalizeVerification(verificationId)
    await loadAll()
  }

  const handleGetReport = async () => {
    if (!verificationId) return
    const data = await fetchReport(verificationId)
    setReportUrl(data.download_url)
  }

  if (loading) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    )
  }

  if (!verification) {
    return (
      <main>
        <p>Verification not found.</p>
      </main>
    )
  }

  return (
    <main>
      <header>
        <div>
          <h1>Verification {verification.id.slice(0, 8)}</h1>
          <p>
            {verification.patient_info?.patient_name} · {verification.payer_name} ·
            <span className={`badge status-${verification.status}`} style={{ marginLeft: 8 }}>
              {verification.status}
            </span>
          </p>
        </div>
        <div className="field-row">
          <button className="ghost" onClick={() => router.push("/worklist")}>Back</button>
          {verification.status === "pending" && (
            <button className="primary" onClick={handleRun}>Run verification</button>
          )}
          {verification.status !== "finalized" && (
            <button className="primary" onClick={handleFinalize}>Finalize</button>
          )}
        </div>
      </header>

      {error && <div className="notice" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="grid two">
          <div className="card">
            <h2>Patient</h2>
            <p><strong>Name:</strong> {verification.patient_info?.patient_name}</p>
            <p><strong>DOB:</strong> {verification.patient_info?.date_of_birth}</p>
            <p><strong>Phone:</strong> {verification.patient_info?.phone || "-"}</p>
            <p><strong>Patient ID:</strong> {verification.patient_info?.patient_identifier || "-"}</p>
          </div>
          <div className="card">
            <h2>Insurance</h2>
            <p><strong>Subscriber:</strong> {verification.insurance_info?.subscriber_name || "-"}</p>
            <p><strong>Relationship:</strong> {verification.insurance_info?.relationship_to_patient}</p>
            <p><strong>Member ID:</strong> {verification.insurance_info?.member_id}</p>
            <p><strong>Group #:</strong> {verification.insurance_info?.group_number || "-"}</p>
          </div>
          <div className="card">
            <h2>Visit</h2>
            <p><strong>Service:</strong> {verification.service_category}</p>
            <p><strong>Scheduled:</strong> {verification.scheduled_at || "-"}</p>
          </div>
        </section>
      )}

      {activeTab === "evidence" && (
        <section className="grid">
          <div className="card">
            <h2>Upload evidence</h2>
            <input type="file" onChange={handleUpload} />
            <small>Supported: PDF, PNG, JPG</small>
          </div>
          <div className="card">
            <h2>Manual transcript</h2>
            <textarea
              rows={4}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Paste call transcript or notes"
            />
            <button className="primary" style={{ marginTop: 8 }} onClick={handleTranscript}>
              Save transcript
            </button>
          </div>
          <div className="card">
            <h2>Artifacts</h2>
            {artifacts.length === 0 ? (
              <p>No evidence uploaded yet.</p>
            ) : (
              <ul>
                {artifacts.map((artifact) => (
                  <li key={artifact.id}>
                    <strong>{artifact.type}</strong> · {artifact.source} · {artifact.filename || "text"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {activeTab === "review" && (
        <section className="card">
          <h2>Draft summary</h2>
          <div className="grid">
            {summary?.fields.map((field: any) => (
              <div key={field.id} className="field-card">
                <div className="field-row">
                  <strong>{field.field_name}</strong>
                  <span className="badge">confidence {Number(field.confidence).toFixed(2)}</span>
                  <span className="badge">{field.status}</span>
                </div>
                <div>
                  <label>Value (JSON)</label>
                  <textarea
                    rows={3}
                    value={fieldEdits[field.field_name]?.value || ""}
                    onChange={(event) =>
                      setFieldEdits({
                        ...fieldEdits,
                        [field.field_name]: {
                          ...fieldEdits[field.field_name],
                          value: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="grid two">
                  <div>
                    <label>Status</label>
                    <select
                      value={fieldEdits[field.field_name]?.status || field.status}
                      onChange={(event) =>
                        setFieldEdits({
                          ...fieldEdits,
                          [field.field_name]: {
                            ...fieldEdits[field.field_name],
                            status: event.target.value,
                          },
                        })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="approved">Approved</option>
                      <option value="edited">Edited</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label>Reviewer note</label>
                    <input
                      value={fieldEdits[field.field_name]?.note || ""}
                      onChange={(event) =>
                        setFieldEdits({
                          ...fieldEdits,
                          [field.field_name]: {
                            ...fieldEdits[field.field_name],
                            note: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field-row">
                  <button className="ghost" onClick={() => handleApprove(field.field_name)}>
                    Approve
                  </button>
                  <button className="ghost" onClick={() => handleUnknown(field.field_name)}>
                    Set unknown
                  </button>
                  <button className="primary" onClick={() => handleFieldSave(field.field_name)}>
                    Save changes
                  </button>
                </div>
                <small>
                  Evidence: {field.evidence_ref_json?.artifact_id || "none"}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "report" && (
        <section className="card">
          <h2>Report</h2>
          <p>Generate and download the finalized benefits summary PDF.</p>
          <button className="primary" onClick={handleGetReport}>
            Get report link
          </button>
          {reportUrl && (
            <p style={{ marginTop: 12 }}>
              <a className="ghost" href={reportUrl} target="_blank" rel="noreferrer">
                Download report
              </a>
            </p>
          )}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="card">
          <h2>Audit log</h2>
          {auditEvents.length === 0 ? (
            <p>No events yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.created_at).toLocaleString()}</td>
                    <td>{event.event_type}</td>
                    <td>{event.actor_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  )
}
