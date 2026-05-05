// Cron heartbeat helper. Wrap any scheduled Edge Function in withCron(name, fn)
// to record start/finish/duration/result rows in cron_runs. Failures don't
// throw — heartbeats are best-effort observability.

import { supabaseAdmin } from "./supabase.ts";

export async function withCron<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
  let runId: number | null = null;
  const startedAt = Date.now();
  try {
    const { data } = await supabaseAdmin
      .from("cron_runs")
      .insert({ job_name: jobName, status: "running" })
      .select("id")
      .single();
    runId = (data as { id: number } | null)?.id ?? null;
  } catch { /* heartbeat is best-effort */ }

  try {
    const result = await fn();
    const finished = new Date().toISOString();
    if (runId !== null) {
      await supabaseAdmin
        .from("cron_runs")
        .update({
          status: "success",
          finished_at: finished,
          duration_ms: Date.now() - startedAt,
          result: result && typeof result === "object" ? (result as Record<string, unknown>) : { value: result },
        })
        .eq("id", runId)
        .then(() => {}, () => {});
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    if (runId !== null) {
      await supabaseAdmin
        .from("cron_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          error: msg,
        })
        .eq("id", runId)
        .then(() => {}, () => {});
    }
    throw e;
  }
}
