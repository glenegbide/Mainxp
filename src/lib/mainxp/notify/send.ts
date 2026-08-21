// Web Push delivery. One MxNotification row = one decision; N subscriptions =
// N deliveries. A 404/410 retires the endpoint (the usual iOS cause: the user
// deleted the home-screen icon, which wipes the subscription).

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { MxNotification } from "@/generated/prisma/client";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false; // honest offline: no fake capability
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:coach@mainxp.app",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export async function deliver(n: MxNotification): Promise<{ sent: number; gone: number }> {
  if (!configure()) return { sent: 0, gone: 0 };
  const subs = await prisma.mxPushSubscription.findMany({
    where: { userId: n.userId, disabledAt: null },
  });
  const payload = JSON.stringify({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.url,
    tag: n.type, // second dedupe layer: iOS replaces same-tag notifications
  });

  let sent = 0;
  let gone = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent += 1;
      await prisma.mxPushSubscription.update({
        where: { id: sub.id },
        data: { lastSuccessAt: new Date(), failureCount: 0 },
      });
    } catch (e: unknown) {
      const status = typeof e === "object" && e !== null && "statusCode" in e ? Number(e.statusCode) : 0;
      if (status === 404 || status === 410) {
        gone += 1;
        await prisma.mxPushSubscription.update({
          where: { id: sub.id },
          data: { disabledAt: new Date() }, // soft-disable, keep for audit
        });
      } else {
        await prisma.mxPushSubscription.update({
          where: { id: sub.id },
          data: { failureCount: { increment: 1 } },
        });
        console.error("push send failed:", status || (e instanceof Error ? e.message : e));
      }
    }
  }
  return { sent, gone };
}
