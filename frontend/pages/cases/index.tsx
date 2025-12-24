import { useEffect, useState } from "react"
import Link from "next/link"
import { createCase, fetchCases, createIntakeText, uploadIntakeFile, fetchIntakeItems, updateIntakeItem } from "../../lib/api"

const emptyCase = { type: "intake", status: "pending", title: "", summary: "" }

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([])
  const [intakeItems, setIntakeItems] = useState<any[]>([])
  const [form, setForm] = useState({ ...emptyCase })
  const [caseIdForIntake, setCaseIdForIntake] = useState<string>("")
  const [intakeText, setIntakeText] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [caseData, intakeData] = await Promise.all([
      fetchCases(""),
      fetchIntakeItems(caseIdForIntake ? `?case_id=${caseIdForIntake}` : ""),
    ])
    setCases(caseData)
    setIntakeItems(intakeData)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [caseIdForIntake])

  const handleCreateCase = async (event: React.FormEvent) => {
    event.preventDefault()
    await createCase(form)
    setForm({ ...emptyCase })
    await load()
  }

  const handleIntakeText = async () => {
    if (!intakeText.trim()) return
    await createIntakeText({ text_content: intakeText, source: "upload", case_id: caseIdForIntake || undefined })
    setIntakeText("")
    await load()
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return
    await uploadIntakeFile(event.target.files[0], { source: "upload", case_id: caseIdForIntake || undefined })
    event.target.value = ""
    await load()
  }

  const assignToCase = async (intakeId: string) => {
    if (!caseIdForIntake) return
    await updateIntakeItem(intakeId, { case_id: caseIdForIntake })
    await load()
  }

  return (
    <main>
      <header>
        <div>
          <h1>Cases & Intake</h1>
          <p>Manage multi-workflow cases and incoming evidence.</p>
        </div>
        <Link className="ghost" href="/worklist">Back to worklist</Link>
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Create case</h2>
        <form onSubmit={handleCreateCase} className="grid two">
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="intake">Intake</option>
              <option value="eligibility">Eligibility</option>
              <option value="prior_auth">Prior Auth</option>
              <option value="appeal">Appeal</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="draft">Draft</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label>Summary</label>
            <textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="primary" type="submit">Create case</button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Intake</h2>
        <div className="grid two">
          <div>
            <label>Case filter / assignment</label>
            <select value={caseIdForIntake} onChange={(e) => setCaseIdForIntake(e.target.value)}>
              <option value="">All cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type} · {c.title || c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Upload artifact</label>
            <input type="file" onChange={handleFile} />
          </div>
          <div>
            <label>Manual note</label>
            <textarea rows={3} value={intakeText} onChange={(e) => setIntakeText(e.target.value)} />
            <button className="primary" style={{ marginTop: 8 }} onClick={handleIntakeText}>Save note</button>
          </div>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Doc type</th>
                <th>Case</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intakeItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.source}</td>
                  <td><span className={`badge status-${item.status}`}>{item.status}</span></td>
                  <td>{item.doc_type || "-"}</td>
                  <td>{item.case_id ? item.case_id.slice(0, 8) : "-"}</td>
                  <td>
                    {caseIdForIntake && item.case_id !== caseIdForIntake && (
                      <button className="ghost" onClick={() => assignToCase(item.id)}>Assign to case</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>{c.type}</td>
                  <td><span className={`badge status-${c.status}`}>{c.status}</span></td>
                  <td>{c.title || "-"}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
