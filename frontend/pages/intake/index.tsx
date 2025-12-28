import { useEffect, useState, useRef } from "react"
import { fetchIntakeItems, uploadIntakeFile, triggerIntakeClassify, bridgeIntakeToCase } from "../../lib/api"
import { StatusBadge, GlassCard } from "../../components/ModernUI"
import { Inbox, Zap, ArrowRight, RefreshCw, FileText, Search, ExternalLink, CheckCircle2, Upload } from "lucide-react"
import { cn } from "../../lib/utils"
import { useRouter } from "next/router"
import { toast } from "sonner"

export default function IntakePage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSimulating, setIsSimulating] = useState(false)
    const router = useRouter()
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchIntakeItems()
            setItems(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Auto-polling: Poll every 2 seconds if there are items in 'processing' status
    useEffect(() => {
        const hasProcessingItems = items.some(item => item.status === 'processing')

        if (hasProcessingItems) {
            pollingRef.current = setInterval(() => {
                loadData()
            }, 2000)
        } else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
            }
        }

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [items])

    useEffect(() => { loadData() }, [])

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/tiff', 'image/png', 'image/jpeg']
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid File Type", {
                description: "Please upload a PDF, TIFF, PNG, or JPEG file"
            })
            return
        }

        setIsSimulating(true)
        try {
            await uploadIntakeFile(file, { source: "manual_upload" })
            toast.success("Document Uploaded", {
                description: `${file.name} added to intake queue`,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            })
            loadData()
        } catch (e: any) {
            toast.error("Upload Failed", {
                description: e.message || "Could not upload file"
            })
        } finally {
            setIsSimulating(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleClassify = async (id: string) => {
        await triggerIntakeClassify(id)
        loadData() // Trigger immediate load, then polling takes over
    }

    const handleBridge = async (id: string) => {
        try {
            const res = await bridgeIntakeToCase(id)
            toast.success("Document bridged to clinical worklist!", {
                description: `Verification ID: ${res.verification_id?.substring(0, 8)}...`,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            })
            if (res.verification_id) {
                router.push(`/verifications/${res.verification_id}`)
            }
            loadData()
        } catch (e: any) {
            toast.error("Bridge Failed", {
                description: e.message || "Could not connect to server. Please try again."
            })
        }
    }

    return (
        <div className="space-y-10 animate-in-fade">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2 text-primary">
                        <Inbox className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Inbound Stream</span>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Digital Fax Inbox</h1>
                    <p className="text-slate-500 mt-2 text-lg">AI-powered classification and routing for incoming medical documents.</p>
                </div>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.tiff,.tif,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="intake-file-upload"
                    />
                    <label
                        htmlFor="intake-file-upload"
                        className={cn(
                            "bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all duration-300 flex items-center gap-3 group active:scale-95 shadow-lg cursor-pointer",
                            isSimulating && "opacity-50 pointer-events-none"
                        )}
                    >
                        {isSimulating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 group-hover:animate-pulse" />}
                        <span>Upload Document</span>
                    </label>
                </div>
            </div>

            <div className="flex items-center gap-4 py-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        disabled
                        placeholder="Search inbox by filename or status..."
                        className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none italic opacity-50"
                    />
                </div>
                <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                    <RefreshCw className={cn("w-5 h-5 text-slate-500", loading && "animate-spin")} />
                </button>
            </div>

            <GlassCard className="p-0 overflow-hidden shadow-2xl shadow-slate-200/50">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Digital Receipt</th>
                            <th>Resource Identifier</th>
                            <th>Platform Status</th>
                            <th>AI Classification</th>
                            <th className="text-right">Intelligence Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-40" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing with medical queue...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-40">
                                        <FileText className="w-8 h-8 text-slate-300" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No inbound traffic detected</p>
                                    </div>
                                </td>
                            </tr>
                        ) : items.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-slate-700">{item.filename}</span>
                                    </div>
                                </td>
                                <td>
                                    <StatusBadge status={item.status === 'pending' ? 'pending' : item.status === 'processing' ? 'processing' : item.status === 'bridged' ? 'finalized' : 'drafted'} />
                                </td>
                                <td>
                                    {item.doc_type ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            <span className="text-sm font-bold text-slate-900">{item.doc_type.replace('_', ' ').toUpperCase()}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs">Waiting for trigger</span>
                                    )}
                                </td>
                                <td className="text-right">
                                    {item.status === "pending" ? (
                                        <button
                                            onClick={() => handleClassify(item.id)}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                        >
                                            Process AI Job
                                        </button>
                                    ) : item.status === "processing" ? (
                                        <div className="flex items-center justify-end gap-2 text-blue-600">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span className="text-xs font-bold uppercase tracking-wider">AI Analyzing...</span>
                                        </div>
                                    ) : item.status === "classified" ? (
                                        <button
                                            onClick={() => handleBridge(item.id)}
                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                                        >
                                            <span>Bridge to Case</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    ) : item.status === "bridged" ? (
                                        <button
                                            onClick={() => router.push(`/verifications/${item.verification_id}`)}
                                            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                                        >
                                            <span>View Case</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-[10px] font-bold uppercase mr-4">Job Locked</span>
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
