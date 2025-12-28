const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export type Tokens = { access_token: string; refresh_token: string }

function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem("auth_tokens")
  return raw ? (JSON.parse(raw) as Tokens) : null
}

function setTokens(tokens: Tokens) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("auth_tokens", JSON.stringify(tokens))
}

export function clearTokens() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("auth_tokens")
}

export async function login(email: string, password: string): Promise<Tokens> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error("Login failed")
  const data = (await res.json()) as Tokens
  setTokens(data)
  return data
}

async function refreshToken(): Promise<Tokens | null> {
  const tokens = getTokens()
  if (!tokens) return null
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as Tokens
  setTokens(data)
  return data
}

async function apiFetch(path: string, init?: RequestInit) {
  const tokens = getTokens()
  const headers = new Headers(init?.headers)
  if (tokens?.access_token) {
    headers.set("Authorization", `Bearer ${tokens.access_token}`)
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed?.access_token) {
      headers.set("Authorization", `Bearer ${refreshed.access_token}`)
      res = await fetch(`${API_BASE}${path}`, { ...init, headers })
    }
  }
  return res
}

export async function fetchWorklist(params = "") {
  const res = await apiFetch(`/verifications${params}`)
  if (!res.ok) throw new Error("Failed to load worklist")
  return res.json()
}

export async function createVerification(payload: any) {
  const res = await apiFetch(`/verifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to create verification")
  return res.json()
}

export async function fetchVerification(id: string) {
  const res = await apiFetch(`/verifications/${id}`)
  if (!res.ok) throw new Error("Failed to load verification")
  return res.json()
}

export async function runVerification(id: string) {
  const res = await apiFetch(`/verifications/${id}/run`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to run verification")
  return res.json()
}

export async function fetchArtifacts(id: string) {
  const res = await apiFetch(`/verifications/${id}/artifacts`)
  if (!res.ok) throw new Error("Failed to load artifacts")
  return res.json()
}

export async function uploadArtifact(id: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  const res = await apiFetch(`/verifications/${id}/artifacts`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Failed to upload artifact")
  return res.json()
}

export async function addTranscript(id: string, text_content: string) {
  const res = await apiFetch(`/verifications/${id}/artifacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text_content }),
  })
  if (!res.ok) throw new Error("Failed to add transcript")
  return res.json()
}

export async function fetchSummary(id: string) {
  const res = await apiFetch(`/verifications/${id}/summary`)
  if (!res.ok) throw new Error("Failed to load summary")
  return res.json()
}

export async function updateSummaryField(id: string, field_name: string, payload: any) {
  const res = await apiFetch(`/verifications/${id}/summary/fields/${field_name}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to update field")
  return res.json()
}

export async function finalizeVerification(id: string) {
  const res = await apiFetch(`/verifications/${id}/finalize`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to finalize")
  return res.json()
}

export async function fetchReport(id: string) {
  const res = await apiFetch(`/verifications/${id}/report`)
  if (!res.ok) throw new Error("Report not ready")
  return res.json()
}

export async function fetchAuditEvents(id: string) {
  const res = await apiFetch(`/audit/verifications/${id}`)
  if (!res.ok) throw new Error("Failed to load audit")
  return res.json()
}

// Cases (multi-workflow)
export async function fetchCases(params = "") {
  const res = await apiFetch(`/cases${params}`)
  if (!res.ok) throw new Error("Failed to load cases")
  return res.json()
}

export async function createCase(payload: any) {
  const res = await apiFetch(`/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to create case")
  return res.json()
}

// Intake
export async function fetchIntakeItems(params = "") {
  const res = await apiFetch(`/intake${params}`)
  if (!res.ok) throw new Error("Failed to load intake items")
  return res.json()
}

export async function createIntakeText(payload: { text_content: string; source?: string; case_id?: string; filename?: string }) {
  const res = await apiFetch(`/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to create intake item")
  return res.json()
}

export async function uploadIntakeFile(file: File, opts?: { source?: string; case_id?: string }) {
  const form = new FormData()
  form.append("file", file)
  if (opts?.source) form.append("source", opts.source)
  if (opts?.case_id) form.append("case_id", opts.case_id)
  const res = await apiFetch(`/intake`, { method: "POST", body: form })
  if (!res.ok) throw new Error("Failed to upload intake item")
  return res.json()
}

export async function updateIntakeItem(id: string, payload: any) {
  const res = await apiFetch(`/intake/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to update intake item")
  return res.json()
}

export async function simulateFaxUpload(file_name: string) {
  const res = await apiFetch(`/intake/fax-upload?file_name=${encodeURIComponent(file_name)}`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to simulate fax upload")
  return res.json()
}

export async function triggerIntakeClassify(id: string) {
  const res = await apiFetch(`/intake/${id}/classify`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to trigger classification")
  return res.json()
}

// Prior Auth
export async function fetchPriorAuths() {
  const res = await apiFetch(`/prior-auth/`)
  if (!res.ok) throw new Error("Failed to load prior auths")
  return res.json()
}

export async function createPriorAuth(payload: any) {
  const res = await apiFetch(`/prior-auth/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to create prior auth")
  return res.json()
}

export async function runPriorAuth(id: string) {
  const res = await apiFetch(`/prior-auth/${id}/run`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to run prior auth")
  return res.json()
}

// Referrals
export async function fetchReferrals() {
  const res = await apiFetch(`/referrals/`)
  if (!res.ok) throw new Error("Failed to load referrals")
  return res.json()
}

export async function createReferral(payload: any) {
  const res = await apiFetch(`/referrals/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to create referral")
  return res.json()
}

export async function runReferral(id: string) {
  const res = await apiFetch(`/referrals/${id}/run`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to run referral")
  return res.json()
}

export async function updateReferral(id: string, payload: any) {
  const res = await apiFetch(`/referrals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to update referral")
  return res.json()
}

export async function bridgeIntakeToCase(itemId: string) {
  const res = await apiFetch(`/intake/${itemId}/bridge`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to bridge item")
  return res.json()
}
