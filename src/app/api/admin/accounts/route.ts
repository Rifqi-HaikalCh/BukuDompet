import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"
import { validateBudgetInput } from "@/lib/finance/budget"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Admin membuat akun baru. Peran admin diperiksa ulang di database.
 * Admin hanya menetapkan NILAI AWAL anggaran anak (bila dikirim). Anggaran lanjutan diatur Supervisor,
 * jadi di sini cukup memastikan nilai awalnya masuk akal: anggaran > 0 dan tabungan wajib < anggaran.
 */
export const POST = authedPost(4_000, async (_req, s, b) => {
  if (b.initial_budget !== undefined || b.initial_saving !== undefined) {
    const v = validateBudgetInput({
      monthlyBudget: Number(b.initial_budget),
      mandatorySavingsTarget: Number(b.initial_saving),
      cycleStartDay: 1,
      rolloverPolicy: "split_choice",
      effectiveScope: "current_month",
    })
    if (!v.ok) return json({ ok: false, reason: "bad_budget", errors: v.errors }, 400)
  }
  const r = await rpc<{ ok: boolean; reason?: string; id?: string }>("app_create_account", {
    p_actor: s.uid,
    p_ver: s.ver,
    p_id: null,
    p_username: String(b.username ?? ""),
    p_display: String(b.display_name ?? ""),
    p_role: String(b.role ?? ""),
    p_pin: String(b.pin ?? ""),
  })
  return json(r, r.ok ? 200 : r.reason === "forbidden" ? 403 : 400)
})
