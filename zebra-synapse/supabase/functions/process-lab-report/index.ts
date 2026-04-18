import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { claimQueuedJobs, processClaimedJob } from "../_shared/lab-report-analysis.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId : undefined;
    const jobs = await claimQueuedJobs({ uploadId, limit: 1 });

    if (!jobs.length) {
      return jsonResponse({ ok: true, claimed: 0, message: "No queued lab-report job found." });
    }

    const result = await processClaimedJob(jobs[0]);
    return jsonResponse({ ok: true, claimed: 1, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected processing error.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
