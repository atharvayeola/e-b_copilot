import { useEffect, useState } from "react"
import { fetchWorklist, fetchPriorAuths, fetchReferrals, fetchIntakeItems } from "../lib/api"
import { MetricCard, GlassCard } from "../components/ModernUI"
import { FileCheck, Clock, Activity, CheckCircle2, TrendingUp, Zap, ArrowRight, Inbox, Users } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
    const [stats, setStats] = useState({
        verifications: 0,
        pa: 0,
        referrals: 0,
        intake: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [v, p, r, i] = await Promise.all([
                    fetchWorklist(),
                    fetchPriorAuths(),
                    fetchReferrals(),
                    fetchIntakeItems()
                ])
                setStats({
                    verifications: v.length,
                    pa: p.length,
                    referrals: r.length,
                    intake: i.filter((x: any) => x.status === "pending").length
                })
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const activities = [
        { id: 1, time: '10:42 AM', text: 'PA #12349 automatically approved', type: 'success' },
        { id: 2, time: '10:30 AM', text: 'New referral received: Jordan Rivera', type: 'info' },
        { id: 3, time: '10:15 AM', text: 'AI requires human review for Intake #8821', type: 'warning' },
        { id: 4, time: '09:55 AM', text: 'Daily synchronization completed', type: 'neutral' },
    ];

    return (
        <div className="space-y-10 animate-in-fade">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Command Center</h1>
                    <p className="text-slate-500 mt-2 text-lg">System status: <span className="text-emerald-600 font-bold">Optimal</span>. AI is running at 98.5% accuracy today.</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold text-slate-700">Live Services</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Clinical PAs"
                    value={stats.pa}
                    trend="+12%"
                    description="vs last week"
                    icon={FileCheck}
                />
                <MetricCard
                    title="Active Referrals"
                    value={stats.referrals}
                    trend="-5%"
                    trendUp={false}
                    description="processing queue"
                    icon={Users}
                />
                <MetricCard
                    title="AI Accuracy"
                    value="98.5%"
                    trend="+0.5%"
                    description="confidence score"
                    icon={Zap}
                />
                <MetricCard
                    title="Auto-Approvals"
                    value="156"
                    trend="+8%"
                    description="this month"
                    icon={CheckCircle2}
                />
            </div>

            <div className="grid gap-8 md:grid-cols-7">
                <GlassCard
                    className="col-span-4"
                    title="Processing Efficiency"
                    subtitle="Throughput of automated clinical reviews over the last 24h"
                >
                    <div className="h-[320px] w-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:bg-slate-50/80 transition-all">
                        <TrendingUp className="w-10 h-10 mb-4 opacity-50 group-hover:text-primary group-hover:scale-110 transition-all" />
                        <p className="font-bold text-sm group-hover:text-slate-600">Real-time Visualization Engine</p>
                        <p className="text-xs opacity-60">Connecting to telemetry stream...</p>
                    </div>
                </GlassCard>

                <GlassCard className="col-span-3" title="Live Activity Feed">
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-3 before:w-0.5 before:bg-slate-100/50">
                        {activities.map((item) => (
                            <div key={item.id} className="relative flex gap-5 items-start pl-10 group cursor-pointer">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 bg-blue-500 group-hover:scale-110 transition-transform" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{item.text}</p>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.time}</span>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        ))}
                    </div>
                    <Link href="/worklist">
                        <button className="w-full mt-10 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all uppercase tracking-widest">
                            View Full Audit Logs
                        </button>
                    </Link>
                </GlassCard>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Link href="/intake">
                    <div className="glass-panel p-8 rounded-3xl flex items-center justify-between group cursor-pointer hover:shadow-2xl transition-all border-white/60">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
                                <Inbox className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Fax Intake Inbox</h3>
                                <p className="text-sm text-slate-500">{stats.intake} New documents awaiting classification</p>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        </div>
                    </div>
                </Link>

                <Link href="/worklist">
                    <div className="glass-panel p-8 rounded-3xl flex items-center justify-between group cursor-pointer hover:shadow-2xl transition-all border-white/60">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                                <Activity className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Eligibility Worklist</h3>
                                <p className="text-sm text-slate-500">{stats.verifications} Active insurance verifications</p>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    )
}
