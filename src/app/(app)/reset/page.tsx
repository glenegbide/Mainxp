import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/mainxp/day";
import { completeReset } from "./actions";
import { ResetFlow } from "./ResetFlow";

// LE RESET — you drifted; return with one action. Under 60 seconds by
// construction: three screens, big targets, one submit.

export default async function ResetPage() {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const today = dayKey(new Date(), user.timezone);

  const [patterns, quest] = await Promise.all([
    prisma.mxPattern.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, fromLabel: true, toLabel: true, trigger: true, newResponse: true },
    }),
    prisma.mxTask.findFirst({
      where: { userId: user.id, dayKey: today, tier: "MAIN_QUEST", status: "OPEN" },
      select: { title: true, nextAction: true },
    }),
  ]);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/today" className="mxp-meta">← Aujourd&apos;hui</Link>
      <h1 className="mt-3 mxp-display">Reset</h1>
      <p className="mxp-meta mt-1">Tu as dérivé. Reviens avec un seul geste.</p>

      <div className="mt-6">
        <ResetFlow
          patterns={patterns}
          questTitle={quest?.title ?? null}
          questNextAction={quest?.nextAction || null}
          act={completeReset}
        />
      </div>
    </main>
  );
}
