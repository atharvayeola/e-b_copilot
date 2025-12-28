import React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { cn } from "../lib/utils"
import { LayoutDashboard, Inbox, FileCheck, Users, Activity, Settings, LogOut } from "lucide-react"
import { clearTokens } from "../lib/api"

export const Sidebar = () => {
    const router = useRouter()

    const navItems = [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Fax Intake", icon: Inbox, path: "/intake" },
        { label: "Medication PA", icon: FileCheck, path: "/prior-auth" },
        { label: "Referrals", icon: Users, path: "/referrals" },
        { label: "Eligibility", icon: Activity, path: "/worklist" },
    ]

    const handleLogout = () => {
        clearTokens()
        router.push("/")
    }

    return (
        <div className="w-64 h-screen bg-slate-950 text-slate-100 flex flex-col border-r border-slate-900 shadow-2xl z-20 transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-display font-bold text-xl tracking-tight text-white">MedOS</div>
                </div>

                <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">
                        Network Operations
                    </div>
                    {navItems.map((item) => {
                        const isActive = router.pathname === item.path
                        return (
                            <Link key={item.path} href={item.path}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 group relative mb-1",
                                        isActive
                                            ? "bg-slate-900 text-white shadow-lg shadow-black/20"
                                            : "text-slate-400 hover:bg-slate-100/10 hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />
                                    )}
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                                        isActive ? "text-primary" : "text-slate-500 group-hover:text-primary"
                                    )} />
                                    <span className={cn(
                                        "font-bold text-sm tracking-tight",
                                        isActive ? "text-white" : "text-inherit"
                                    )}>{item.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>

            <div className="mt-auto p-6 border-t border-sidebar-border bg-sidebar-accent/10">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center border border-sidebar-border shadow-inner">
                        <span className="text-xs font-bold text-primary">AD</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold truncate text-white">Admin User</div>
                        <div className="text-[10px] text-sidebar-foreground/40 truncate uppercase tracking-wider font-bold">Chief Medical Officer</div>
                    </div>
                </div>
                <div className="space-y-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium text-left">System Logout</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-50 overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
                {/* Subtle Background Texture */}
                <div
                    className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
                    style={{
                        backgroundImage: `url(/texture.png)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed'
                    }}
                />

                {/* Top Fade - Lowered z-index and reduced height to avoid washing out buttons */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 via-slate-50/40 to-transparent z-0 pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto p-8 pt-10 animate-in-fade">
                    {children}
                </div>
            </main>
        </div>
    )
}
