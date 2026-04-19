import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { claimQueuedJobs, processClaimedJob } from "../_shared/lab-report-analysis.ts";
import { jsonResponse, optionsResponse } from "../_shared/http.ts";

type RuntimeWithWaitUntil = typeof globalThis & {
  EdgeRuntime?: {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId : undefined;
    const limit = typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 3) : 1;
    const jobs = await claimQueuedJobs({ uploadId, limit });

    if (!jobs.length) {
      return jsonResponse({ ok: true, claimed: 0, message: "No queued lab-report jobs found." }, 202);
    }

    const work = Promise.all(jobs.map((job) => processClaimedJob(job)));
    const runtime = globalThis as RuntimeWithWaitUntil;
    if (runtime.EdgeRuntime?.waitUntil) {
      runtime.EdgeRuntime.waitUntil(work);
    } else {
      await work;
    }

    return jsonResponse(
      {
        ok: true,
        claimed: jobs.length,
        uploadIds: jobs.map((job) => job.upload_id),
      },
      202,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected queueing error.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
