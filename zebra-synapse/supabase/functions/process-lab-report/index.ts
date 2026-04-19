import { claimQueuedJobs, processClaimedJob } from "../_shared/lab-report-analysis.ts";
import { jsonResponse, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
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
