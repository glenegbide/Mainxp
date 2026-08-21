// The notification tick. iOS PWAs cannot schedule notifications locally, so
// every nudge must leave the server at the right local minute — this route is
// called every 15 minutes by an external scheduler (see .github/workflows).

import { runNotificationTick } from "@/lib/mainxp/notify/engine";

export const runtime = "nodejs"; // web-push needs Node crypto
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.MAINXP_JOBS_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").includes("vercel-cron");
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await runNotificationTick();
  return Response.json(result);
}
