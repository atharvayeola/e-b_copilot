import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import {
  createVerification,
  fetchWorklist,
  runVerification,
} from "../lib/api"
import { validateVerificationForm, getFieldError, ValidationError } from "../lib/validation"
import { cn } from "../lib/utils"
import { StatusBadge, GlassCard } from "../components/ModernUI"
import { Search, Filter, Plus, FileText, Zap, ArrowRight, RefreshCw, X, User, Calendar, ShieldCheck, Activity } from "lucide-react"

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
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: "", payer: "" })
  const [form, setForm] = useState({ ...emptyForm })
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationError[]>([])

  const loadWorklist = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.payer) params.append("payer_name", filters.payer)
      const data = await fetchWorklist(params.toString() ? `?${params.toString()}` : "")
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorklist()
  }, [filters.status, filters.payer])

  const handleRun = async (id: string) => {
    await runVerification(id)
    loadWorklist()
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormErrors([])

    // Frontend validation
    const validation = validateVerificationForm({
      payer_name: form.payer_name,
      service_category: form.service_category,
      patient_name: form.patient_name,
      date_of_birth: form.date_of_birth,
      member_id: form.member_id,
      phone: form.phone,
    })
    if (!validation.valid) {
      setFormErrors(validation.errors)
      return
    }

    setCreating(true)
    try {
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
      setShowCreate(false)
      loadWorklist()
    } catch (err: any) {
      setFormErrors([{ field: 'general', message: err.message || 'Failed to create verification' }])
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-10 animate-in-fade">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Revenue Integrity</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Eligibility Worklist</h1>
          <p className="text-slate-500 mt-2 text-lg">Real-time insurance verification and benefit breakdown orchestration.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary text-white px-8 py-3.5 rounded-2xl font-bold hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 flex items-center gap-3 shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Verify New Member</span>
        </button>
      </div>

      {showCreate && (
        <GlassCard className="border-primary/20 shadow-2xl shadow-primary/5 animate-in-fade">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">Benefit Verification Request</h2>
              <p className="text-sm text-slate-500">Initiate a 270/271 transaction or AI-driven portal scrape.</p>
            </div>
            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Payer Information</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Payer/Carrier Name</label>
                    <input
                      value={form.payer_name}
                      placeholder="e.g. Blue Cross Blue Shield"
                      onChange={(event) => setForm({ ...form, payer_name: event.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ${getFieldError(formErrors, 'payer_name') ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    />
                    {getFieldError(formErrors, 'payer_name') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'payer_name')}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Plan / Group Name</label>
                    <input
                      value={form.plan_name}
                      placeholder="e.g. PPO / Gold 80"
                      onChange={(event) => setForm({ ...form, plan_name: event.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Member Identity</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Member ID</label>
                    <input
                      value={form.member_id}
                      placeholder="ID Number"
                      onChange={(event) => setForm({ ...form, member_id: event.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 transition-all outline-none ${getFieldError(formErrors, 'member_id') ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    />
                    {getFieldError(formErrors, 'member_id') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'member_id')}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Patient Name</label>
                    <input
                      value={form.patient_name}
                      placeholder="Last, First Name"
                      onChange={(event) => setForm({ ...form, patient_name: event.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ${getFieldError(formErrors, 'patient_name') ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    />
                    {getFieldError(formErrors, 'patient_name') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'patient_name')}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Clinical Intent</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Service Class</label>
                    <input
                      value={form.service_category}
                      placeholder="e.g. Physical Therapy"
                      onChange={(event) => setForm({ ...form, service_category: event.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ${getFieldError(formErrors, 'service_category') ? 'border-red-400' : 'border-slate-200'}`}
                      required
                    />
                    {getFieldError(formErrors, 'service_category') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'service_category')}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Appt Timestamp</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {getFieldError(formErrors, 'general') && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                {getFieldError(formErrors, 'general')}
              </div>
            )}

            <div className="flex justify-end gap-6 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Discard</button>
              <button type="submit" disabled={creating} className="bg-slate-900 text-white px-12 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                {creating ? "Processing..." : "Submit Transaction"}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Filters Overlay */}
      <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            placeholder="Filter by payer name..."
            className="bg-transparent border-none text-sm outline-none w-full"
            value={filters.payer}
            onChange={(e) => setFilters({ ...filters, payer: e.target.value })}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Aesthetic Filter: Status</option>
          <option value="pending">Pending</option>
          <option value="needs_human_review">Needs Review</option>
          <option value="finalized">Finalized</option>
        </select>
        <button onClick={loadWorklist} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-200">
          <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
        </button>
      </div>

      <GlassCard className="p-0 overflow-hidden shadow-2xl shadow-slate-200/50 border-none">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Patient & Identifier</th>
              <th>Payer Context</th>
              <th>Clinical Goal</th>
              <th>Status Logic</th>
              <th className="text-right">Intelligence Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="animate-pulse flex flex-col items-center gap-4 opacity-40">
                    <ShieldCheck className="w-12 h-12 text-primary" />
                    <span className="font-bold uppercase tracking-widest text-xs">Querying Clearinghouse...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <FileText className="w-12 h-12 text-slate-300" />
                    <span className="font-bold uppercase tracking-widest text-xs italic">Worklist currenty empty</span>
                  </div>
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                <td>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.patient_name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {item.patient_identifier || "NO-IDENTIFIER"}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{item.payer_name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">ID: {item.member_id}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{item.service_category}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "Routine Walk-In"}
                    </span>
                  </div>
                </td>
                <td>
                  <StatusBadge status={
                    item.status === 'pending' ? 'pending' :
                      item.status === 'running' ? 'processing' :
                        item.status === 'needs_human_review' ? 'urgent' : 'finalized'
                  } />
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => handleRun(item.id)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                        title="Run 270 Transaction"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                      </button>
                    )}
                    <Link
                      href={`/verifications/${item.id}`}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 group-hover:border-primary/30 group-hover:text-primary shadow-sm active:scale-95"
                    >
                      <span>Analyze Case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

