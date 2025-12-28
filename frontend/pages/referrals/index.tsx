import { useEffect, useState } from "react"
import { fetchReferrals, createReferral, runReferral, updateReferral } from "../../lib/api"
import { validateReferralForm, getFieldError, ValidationError } from "../../lib/validation"
import { StatusBadge, GlassCard } from "../../components/ModernUI"
import { Users, UserPlus, Zap, ArrowRight, X, Phone, Mail, MapPin, Search, RefreshCw, Calendar } from "lucide-react"
import { cn } from "../../lib/utils"
import { toast } from "sonner"

export default function ReferralsPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newRef, setNewRef] = useState({ patient_name: "", referring_provider: "", target_specialty: "", clinical_urgency: "routine" })
    const [formErrors, setFormErrors] = useState<ValidationError[]>([])
    const [scheduleId, setScheduleId] = useState<string | null>(null)
    const [schedDate, setSchedDate] = useState("")
    const [schedTime, setSchedTime] = useState("09:00")

    const handleConfirmSchedule = async () => {
        if (!scheduleId) return
        try {
            await updateReferral(scheduleId, {
                status: "scheduled",
                content_json: { appointment_at: `${schedDate} ${schedTime}` }
            })
            toast.success("Appointment Confirmed", {
                description: `Patient scheduled for ${schedDate} at ${schedTime}`,
                icon: <Calendar className="w-4 h-4 text-purple-500" />
            })
            setScheduleId(null)
            loadData()
        } catch (e: any) {
            toast.error("Scheduling Failed", { description: e.message })
        }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchReferrals()
            setItems(data)
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
        const validation = validateReferralForm({
            patient_name: newRef.patient_name,
            clinical_urgency: newRef.clinical_urgency,
            referring_provider: newRef.referring_provider,
            target_specialty: newRef.target_specialty
        })
        if (!validation.valid) {
            setFormErrors(validation.errors)
            return
        }

        try {
            await createReferral(newRef)
            setShowCreate(false)
            setNewRef({ patient_name: "", referring_provider: "", target_specialty: "", clinical_urgency: "routine" })
            loadData()
        } catch (err: any) {
            setFormErrors([{ field: 'general', message: err.message || 'Failed to create referral' }])
        }
    }

    const handleRun = async (id: string) => {
        await runReferral(id)
        loadData()
    }

    return (
        <div className="space-y-10 animate-in-fade">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2 text-primary">
                        <UserPlus className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Growth Engine</span>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Referral Management</h1>
                    <p className="text-slate-500 mt-2 text-lg">Intelligent triage and qualification for inbound patient referrals.</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all duration-300 flex items-center gap-3 group active:scale-95 shadow-lg"
                >
                    {showCreate ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5 group-hover:animate-pulse" />}
                    <span>{showCreate ? 'Cancel' : 'New Referral'}</span>
                </button>
            </div>

            {showCreate && (
                <GlassCard className="p-8 border-l-4 border-l-emerald-500 animate-in-slide">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Manual Entry</h3>
                            <p className="text-slate-500 text-sm">Enter referral details manually for immediate qualification.</p>
                        </div>
                        <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Patient Identity</label>
                            <input
                                placeholder="Full Name"
                                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none ${getFieldError(formErrors, 'patient_name') ? 'border-red-400' : 'border-slate-200'}`}
                                value={newRef.patient_name}
                                onChange={e => setNewRef({ ...newRef, patient_name: e.target.value })}
                                required
                            />
                            {getFieldError(formErrors, 'patient_name') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'patient_name')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Source Provider</label>
                            <input
                                placeholder="Referring MD/Clinic"
                                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none ${getFieldError(formErrors, 'referring_provider') ? 'border-red-400' : 'border-slate-200'}`}
                                value={newRef.referring_provider}
                                onChange={e => setNewRef({ ...newRef, referring_provider: e.target.value })}
                            />
                            {getFieldError(formErrors, 'referring_provider') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'referring_provider')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Dest. Specialty</label>
                            <input
                                placeholder="Clinic/Specialty"
                                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none ${getFieldError(formErrors, 'target_specialty') ? 'border-red-400' : 'border-slate-200'}`}
                                value={newRef.target_specialty}
                                onChange={e => setNewRef({ ...newRef, target_specialty: e.target.value })}
                            />
                            {getFieldError(formErrors, 'target_specialty') && <p className="text-red-500 text-xs px-1">{getFieldError(formErrors, 'target_specialty')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Triage Urgency</label>
                            <select
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none appearance-none cursor-pointer"
                                value={newRef.clinical_urgency}
                                onChange={e => setNewRef({ ...newRef, clinical_urgency: e.target.value })}
                            >
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4 flex justify-end gap-4 mt-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancel</button>
                            <button type="submit" className="bg-emerald-600 text-white px-10 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Verify & Qualify</button>
                        </div>
                    </form>
                </GlassCard>
            )}

            <div className="flex items-center gap-4 py-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        disabled
                        placeholder="Search referrals by name, specialty, or source..."
                        className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none italic opacity-50"
                    />
                </div>
                <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                    <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
                </button>
            </div>

            <GlassCard className="p-0 overflow-hidden shadow-2xl shadow-slate-200/40">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Triage</th>
                            <th>Patient Identity</th>
                            <th>Inbound Logic</th>
                            <th>Processing</th>
                            <th className="text-right">Orchestration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && items.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50 underline-none">Synchronizing growth engine...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">No inbound referrals detected in queue.</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.id} className="group">
                                <td>
                                    <StatusBadge status={item.clinical_urgency === 'stat' ? 'urgent' : item.clinical_urgency === 'urgent' ? 'drafted' : 'pending'} />
                                </td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xs ring-4 ring-emerald-50/50">
                                            {item.patient_name.split(' ').map((nLine: string) => nLine[0]).join('')}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{item.patient_name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">DOB: XX/XX/19XX</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">{item.referring_provider}</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase tracking-tighter">
                                                {item.target_specialty}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <StatusBadge status={item.status === 'scheduled' ? 'scheduled' : item.status === 'qualified' ? 'finalized' : item.status === 'processing' ? 'processing' : 'pending'} />
                                </td>
                                <td className="text-right">
                                    {item.status === "new" ? (
                                        <button
                                            onClick={() => handleRun(item.id)}
                                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                        >
                                            <Zap className="w-3 h-3 fill-current" />
                                            Analyze AI
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2 pr-2">
                                            <button
                                                onClick={() => toast.info("Phone Contact", { description: "Initiating call to patient..." })}
                                                className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer border border-slate-100"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => toast.info("Email Contact", { description: "Opening email composer..." })}
                                                className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer border border-slate-100"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setScheduleId(item.id)}
                                                className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 ml-4 flex items-center gap-2"
                                            >
                                                <span>Schedule</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>


            {
                scheduleId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in-fade p-4">
                        <GlassCard className="w-full max-w-sm p-8 animate-in-zoom border-t-4 border-t-purple-500 shadow-2xl">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Schedule Appointment</h3>
                            <p className="text-slate-500 text-sm mb-6">Select a slot for patient intake.</p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</label>
                                    <input
                                        type="date"
                                        value={schedDate}
                                        onChange={e => setSchedDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Time</label>
                                    <input
                                        type="time"
                                        value={schedTime}
                                        onChange={e => setSchedTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setScheduleId(null)}
                                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmSchedule}
                                        className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-95"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )
            }
        </div >
    )
}

