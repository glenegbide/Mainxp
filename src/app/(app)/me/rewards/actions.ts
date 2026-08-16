"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMxUser } from "@/lib/mainxp/auth";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { emitEvent } from "@/lib/mainxp/events";

const s = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max);

export async function createReward(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const title = s(formData.get("title"));
  const cost = Math.round(Number(formData.get("costCoins")));
  if (!title || !Number.isFinite(cost) || cost < 1 || cost > 100_000) return;
  const count = await prisma.mxReward.count({ where: { userId: user.id, active: true } });
  if (count >= 20) return;
  await prisma.mxReward.create({ data: { userId: user.id, title, costCoins: cost } });
  revalidatePath("/me/rewards");
}

export async function redeemReward(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  const reward = await prisma.mxReward.findFirst({ where: { id, userId: user.id, active: true } });
  if (!reward) return;
  const totals = await xpTotals(user.id);
  if (totals.coins < reward.costCoins) return; // UI disables, server enforces

  // Spending goes through the same event → ledger path — negative coins, zero XP.
  const event = await emitEvent(
    user,
    "reward_redeemed",
    { rewardId: reward.id, title: reward.title, cost: reward.costCoins },
    { idempotencyKey: `reward:${reward.id}:${reward.redeemedCount + 1}` }
  );
  if (event) {
    await prisma.mxReward.update({
      where: { id: reward.id },
      data: { redeemedCount: { increment: 1 } },
    });
  }
  revalidatePath("/me/rewards");
}

export async function archiveReward(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const id = s(formData.get("id"), 40);
  await prisma.mxReward.updateMany({
    where: { id, userId: user.id },
    data: { active: false },
  });
  revalidatePath("/me/rewards");
}
