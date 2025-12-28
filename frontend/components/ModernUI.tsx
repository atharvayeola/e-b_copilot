import React from "react"
import { cn } from "../lib/utils"
import { Loader2, CheckCircle2, FileText, AlertCircle, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react"

// --- StatusBadge ---
export type StatusType = "pending" | "processing" | "drafted" | "finalized" | "urgent" | "scheduled"

interface StatusBadgeProps {
    status: StatusType
    className?: string
    showIcon?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showIcon = true }) => {
    const styles = {
        pending: "bg-slate-100 text-slate-600 border-slate-200",
        processing: "bg-blue-50 text-blue-700 border-blue-200",
        drafted: "bg-amber-50 text-amber-700 border-amber-200",
        finalized: "bg-emerald-50 text-emerald-700 border-emerald-200",
        urgent: "bg-red-50 text-red-700 border-red-200",
        scheduled: "bg-purple-50 text-purple-700 border-purple-200",
    }

    const icons = {
        pending: <FileText className="w-3.5 h-3.5 mr-1.5" />,
        processing: <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />,
        drafted: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
        finalized: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />,
        urgent: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
        scheduled: <Calendar className="w-3.5 h-3.5 mr-1.5" />,
    }

    const labels = {
        pending: "Pending AI",
        processing: "Processing...",
        drafted: "Needs Review",
        finalized: "Approved",
        urgent: "STAT Request",
        scheduled: "Scheduled",
    }

    return (
        <div className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-300",
            styles[status] || styles.pending,
            status === "processing" && "pulse-ring",
            className
        )}>
            {showIcon && (icons[status] || icons.pending)}
            {labels[status] || status}
        </div>
    )
}

// --- MetricCard ---
interface MetricCardProps {
    title: string
    value: string | number
    trend?: string
    trendUp?: boolean
    description?: string
    icon: React.ElementType
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    trend,
    trendUp = true,
    description,
    icon: Icon
}) => {
    return (
        <div className="glass-panel p-6 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-white/40 group">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                    {title}
                </span>
                <div className="h-10 w-10 rounded-xl bg-slate-50/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
            </div>
            <div className="text-4xl font-bold font-display tracking-tight text-slate-900 mb-2">{value}</div>
            {(trend || description) && (
                <p className="text-[11px] text-slate-500 flex items-center font-medium">
                    {trend && (
                        <span className={cn(
                            "flex items-center font-bold mr-2 px-1.5 py-0.5 rounded-md bg-opacity-10",
                            trendUp ? "text-emerald-600 bg-emerald-100" : "text-red-600 bg-red-100"
                        )}>
                            {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {trend}
                        </span>
                    )}
                    {description}
                </p>
            )}
        </div>
    )
}

// --- GlassCard (Standard Container) ---
export const GlassCard = ({ children, className, title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) => {
    return (
        <div className={cn("glass-panel rounded-2xl p-6 border-white/40", className)}>
            {(title || subtitle) && (
                <div className="mb-6">
                    {title && <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>}
                    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    )
}
