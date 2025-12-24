import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import {
  createVerification,
  fetchWorklist,
  fetchCases,
  fetchIntakeItems,
  clearTokens,
  runVerification,
} from "../lib/api"

const emptyForm = {
  payer_name: "",
  plan_name: "",
  service_category: "",
  scheduled_at: "",
  patient_name: "",
  date_of_birth: "",
  phone: "",
  patient_identifier: "",
  subscriber_name: "",
  relationship_to_patient: "self",
  member_id: "",
  group_number: "",
}

export default function WorklistPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [intakeItems, setIntakeItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"verifications" | "cases">("verifications")
  const [filters, setFilters] = useState({ status: "", payer: "" })
  const [form, setForm] = useState({ ...emptyForm })
  const [creating, setCreating] = useState(false)

  const loadWorklist = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.append("status", filters.status)
    if (filters.payer) params.append("payer_name", filters.payer)
    const data = await fetchWorklist(params.toString() ? `?${params.toString()}` : "")
    setItems(data)
    setLoading(false)
  }

  const loadCasesAndIntake = async () => {
    setLoading(true)
    const [caseData, intakeData] = await Promise.all([fetchCases(""), fetchIntakeItems("")])
    setCases(caseData)
    setIntakeItems(intakeData)
    setLoading(false)
  }

  useEffect(() => {
    loadWorklist()
  }, [filters.status, filters.payer])

  useEffect(() => {
    if (mode === "cases") {
      loadCasesAndIntake()
    } else {
      loadWorklist()
    }
  }, [mode])

  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("auth_tokens")) {
      router.push("/")
    }
  }, [router])

  const handleRun = async (id: string) => {
    await runVerification(id)
    await loadWorklist()
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    const payload = {
      payer_name: form.payer_name,
      plan_name: form.plan_name || null,
      service_category: form.service_category,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      patient_info: {
        patient_name: form.patient_name,
        date_of_birth: form.date_of_birth,
        phone: form.phone || null,
        patient_identifier: form.patient_identifier || null,
      },
      insurance_info: {
        subscriber_name: form.subscriber_name || null,
        relationship_to_patient: form.relationship_to_patient,
        member_id: form.member_id,
        group_number: form.group_number || null,
      },
    }
    await createVerification(payload)
    setForm({ ...emptyForm })
    setCreating(false)
    await loadWorklist()
  }

  return (
    <main>
      <header>
        <div>
          <h1>Verification Worklist</h1>
          <p>Track eligibility checks and route exceptions for review.</p>
        </div>
        <div className="grid" style={{ gridAutoFlow: "column", gap: 12 }}>
          <button
            className="ghost"
            onClick={() => {
              clearTokens()
              router.push("/")
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${mode === "verifications" ? "active" : ""}`} onClick={() => setMode("verifications")}>
          Verifications
        </button>
        <button className={`tab ${mode === "cases" ? "active" : ""}`} onClick={() => setMode("cases")}>
          Cases & Intake
        </button>
      </div>

      {mode === "verifications" && (
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Create verification</h2>
        <form onSubmit={handleCreate} className="grid two">
          <div>
            <label>Payer name</label>
            <input
              value={form.payer_name}
              onChange={(event) => setForm({ ...form, payer_name: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Plan name</label>
            <input
              value={form.plan_name}
              onChange={(event) => setForm({ ...form, plan_name: event.target.value })}
            />
          </div>
          <div>
            <label>Service category</label>
            <input
              value={form.service_category}
              onChange={(event) => setForm({ ...form, service_category: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Scheduled at</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
            />
          </div>
          <div>
            <label>Patient name</label>
            <input
              value={form.patient_name}
              onChange={(event) => setForm({ ...form, patient_name: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Date of birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Member ID</label>
            <input
              value={form.member_id}
              onChange={(event) => setForm({ ...form, member_id: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Relationship</label>
            <select
              value={form.relationship_to_patient}
              onChange={(event) => setForm({ ...form, relationship_to_patient: event.target.value })}
            >
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label>Subscriber name</label>
            <input
              value={form.subscriber_name}
              onChange={(event) => setForm({ ...form, subscriber_name: event.target.value })}
            />
          </div>
          <div>
            <label>Group number</label>
            <input
              value={form.group_number}
              onChange={(event) => setForm({ ...form, group_number: event.target.value })}
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div>
            <label>Patient identifier</label>
            <input
              value={form.patient_identifier}
              onChange={(event) => setForm({ ...form, patient_identifier: event.target.value })}
            />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create verification"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="grid" style={{ gridAutoFlow: "column", gap: 12, marginBottom: 16 }}>
          <div>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="blocked_needs_evidence">Blocked</option>
              <option value="draft_ready">Draft ready</option>
              <option value="needs_human_review">Needs review</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          <div>
            <label>Payer</label>
            <input
              value={filters.payer}
              onChange={(event) => setFilters({ ...filters, payer: event.target.value })}
            />
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Payer</th>
                <th>Service</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.patient_name}</td>
                  <td>{item.payer_name}</td>
                  <td>{item.service_category}</td>
                  <td>
                    <span className={`badge status-${item.status}`}>{item.status}</span>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="field-row">
                      <Link className="ghost" href={`/verifications/${item.id}`}>
                        Open
                      </Link>
                      {item.status === "pending" && (
                        <button className="ghost" onClick={() => handleRun(item.id)}>
                          Run
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      )}

      {mode === "cases" && (
        <section className="card">
          <h2>Cases</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.type}</td>
                    <td>
                      <span className={`badge status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>{c.title || "-"}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 style={{ marginTop: 24 }}>Intake items</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Doc type</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {intakeItems.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.source}</td>
                    <td>
                      <span className={`badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>{item.doc_type || "-"}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
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
