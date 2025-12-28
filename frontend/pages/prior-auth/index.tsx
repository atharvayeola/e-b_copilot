import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { fetchPriorAuths, createPriorAuth, runPriorAuth, fetchWorklist } from "../../lib/api"
import { validatePriorAuthForm, getFieldError, ValidationError } from "../../lib/validation"
import { StatusBadge, GlassCard } from "../../components/ModernUI"
import { FileCheck, Activity, Zap, Plus, X, ArrowRight, ClipboardCheck, Pill, Hash } from "lucide-react"
import { toast } from "sonner"

export default function PriorAuthPage() {
    const router = useRouter()
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [verifications, setVerifications] = useState<any[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [newPA, setNewPA] = useState({ medication_name: "", procedure_code: "", verification_id: "" })
    const [formErrors, setFormErrors] = useState<ValidationError[]>([])

    const loadData = async () => {
        setLoading(true)
        try {
            const [paData, vData] = await Promise.all([fetchPriorAuths(), fetchWorklist()])
            setItems(paData)
            setVerifications(vData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormErrors([])

        // Frontend validation
        const validation = validatePriorAuthForm({
            medication_name: newPA.medication_name,
            procedure_code: newPA.procedure_code,
        })
        if (!validation.valid) {
            setFormErrors(validation.errors)
            return
        }

        try {
            await createPriorAuth(newPA)
            setShowCreate(false)
            setNewPA({ medication_name: "", procedure_code: "", verification_id: "" })
            loadData()
        } catch (err: any) {
            setFormErrors([{ field: 'general', message: err.message || 'Failed to create prior auth' }])
        }
    }

    const handleRun = async (id: string) => {
        await runPriorAuth(id)
        loadData()
    }

    return (
        <div className="space-y-10 animate-in-fade">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2 text-primary">
                        <FileCheck className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Clinical Governance</span>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Medication Prior Auth</h1>
                    <p className="text-slate-500 mt-2 text-lg">Automate clinical evidence extraction and medical necessity criteria checks.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all duration-300 flex items-center gap-3 shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>New PA Request</span>
                </button>
            </div>

            {showCreate && (
                <GlassCard className="border-primary/20 shadow-2xl shadow-primary/5 animate-in-fade">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Initiate Authorization</h2>
                            <p className="text-sm text-slate-500">Provide medication and clinical context for AI extraction.</p>
                        </div>
                        <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Medication Name</label>
                            <div className="relative">
                                <Pill className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    placeholder="e.g. Humira, Keytruda"
                                    className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ${getFieldError(formErrors, 'medication_name') ? 'border-red-400' : 'border-slate-200'}`}
                                    value={newPA.medication_name}
                                    onChange={e => setNewPA({ ...newPA, medication_name: e.target.value })}
                                    required
                                />
                            </div>
                            {getFieldError(formErrors, 'medication_name') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'medication_name')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Procedural Identifier</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    placeholder="CPT / J-Code"
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    value={newPA.procedure_code}
                                    onChange={e => setNewPA({ ...newPA, procedure_code: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Clinical Context</label>
                            <div className="relative">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer"
                                    value={newPA.verification_id}
                                    onChange={e => setNewPA({ ...newPA, verification_id: e.target.value })}
                                >
                                    <option value="">Link to Eligibility Case</option>
                                    {verifications.map(v => (
                                        <option key={v.id} value={v.id}>{v.patient_info?.patient_name} ({v.payer_name})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-4 mt-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancel</button>
                            <button type="submit" className="bg-slate-900 text-white px-10 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">Deploy Request</button>
                        </div>
                    </form>
                </GlassCard>
            )}

            <GlassCard className="p-0 overflow-hidden shadow-2xl shadow-slate-200/40">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Network Status</th>
                            <th>Medication Detail</th>
                            <th>Auth Reference</th>
                            <th>Submission Window</th>
                            <th className="text-right">Orchestration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && items.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50 underline-none">Synchronizing with Payer Portals...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">No historical Prior Auth records detected.</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <StatusBadge status={
                                        item.status === "pending" || item.status === "new" ? "pending" :
                                            item.status === "processing" ? "processing" :
                                                item.response_json?.status === "approved" ? "finalized" : "urgent"
                                    } />
                                </td>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{item.medication_name}</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                            <Hash className="w-2.5 h-2.5 text-primary" />
                                            {item.procedure_code || "NON-SPECIFIC"}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-2">
                                        <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700 font-mono tracking-tighter">
                                            {item.response_json?.auth_number || "AWAITING_ID"}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex flex-col italic">
                                        <span className="text-sm text-slate-600 font-medium">
                                            {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "Pending Deployment"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Coverage Period</span>
                                    </div>
                                </td>
                                <td className="text-right">
                                    {item.status === "pending" || item.status === "new" ? (
                                        <button
                                            onClick={() => handleRun(item.id)}
                                            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                        >
                                            <Zap className="w-3 h-3 fill-current" />
                                            Run AI Workflow
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/verifications/${item.verification_id}?tab=evidence`)}
                                            className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 ml-auto border border-slate-200"
                                        >
                                            <span>Examine Evidence</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>
        </div>
    )
}
