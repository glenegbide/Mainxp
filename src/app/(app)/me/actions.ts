"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { destroySession, requireMxUser } from "@/lib/mainxp/auth";
import { xpTotals } from "@/lib/mainxp/xp/ledger";
import { emitEvent } from "@/lib/mainxp/events";
import { gearById, slotOf } from "@/lib/mainxp/gear";
import { providerForKey } from "@/lib/mainxp/ai/provider";

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Recovery mode (the "inn"): pauses Élan decay. Rest is part of the game, not a failure. */
export async function toggleRestMode(): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxUser.update({
    where: { id: user.id },
    data: { restMode: !user.restMode },
  });
  revalidatePath("/me");
  revalidatePath("/today");
}

/**
 * Personal AI key, set in-app — no server dashboard needed. The key is tested
 * with a real provider call BEFORE being saved, so a saved key is a working
 * key. Stored server-side in the user's own database; never sent to the client
 * (the UI only ever shows a masked tail).
 */
export async function saveAiKey(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const key = String(formData.get("aiKey") ?? "").trim();
  if (!key || key.length > 300 || /\s/.test(key)) redirect("/me?ai=invalid#coach-ia");

  let works = false;
  try {
    const result = await providerForKey(key).chat({
      system: "Réponds uniquement « OK ».",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 16,
    });
    works = result.text.length > 0;
  } catch {
    works = false;
  }
  if (!works) redirect("/me?ai=invalid#coach-ia");

  await prisma.mxUser.update({ where: { id: user.id }, data: { aiKey: key } });
  revalidatePath("/me");
  revalidatePath("/coach");
  revalidatePath("/dump");
  redirect("/me?ai=ok#coach-ia");
}

export async function removeAiKey(): Promise<void> {
  const user = await requireMxUser();
  await prisma.mxUser.update({ where: { id: user.id }, data: { aiKey: null } });
  revalidatePath("/me");
  revalidatePath("/coach");
  revalidatePath("/dump");
}

export async function buyGear(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const gearId = String(formData.get("gearId") ?? "");
  const gear = gearById(gearId);
  if (!gear) return;
  const owned = await prisma.mxGearOwned.findUnique({
    where: { userId_gearId: { userId: user.id, gearId } },
  });
  if (owned) return;
  const totals = await xpTotals(user.id);
  if (totals.coins < gear.costCoins) return; // UI disables, server enforces

  const event = await emitEvent(
    user,
    "gear_purchased",
    { gearId, title: gear.name, cost: gear.costCoins },
    { idempotencyKey: `gear:${user.id}:${gearId}` }
  );
  if (!event) return;

  // Equip immediately; unequip anything else in the same slot.
  const equipped = await prisma.mxGearOwned.findMany({
    where: { userId: user.id, equipped: true },
  });
  const conflicts = equipped.filter((g) => slotOf(g.gearId) === gear.slot).map((g) => g.id);
  await prisma.$transaction([
    prisma.mxGearOwned.updateMany({ where: { id: { in: conflicts } }, data: { equipped: false } }),
    prisma.mxGearOwned.create({ data: { userId: user.id, gearId, equipped: true } }),
  ]);
  revalidatePath("/me");
  revalidatePath("/today");
}

export async function toggleGear(formData: FormData): Promise<void> {
  const user = await requireMxUser();
  const gearId = String(formData.get("gearId") ?? "");
  const owned = await prisma.mxGearOwned.findUnique({
    where: { userId_gearId: { userId: user.id, gearId } },
  });
  if (!owned) return;
  if (owned.equipped) {
    await prisma.mxGearOwned.update({ where: { id: owned.id }, data: { equipped: false } });
  } else {
    const slot = slotOf(gearId);
    const equipped = await prisma.mxGearOwned.findMany({
      where: { userId: user.id, equipped: true },
    });
    const conflicts = equipped.filter((g) => slotOf(g.gearId) === slot).map((g) => g.id);
    await prisma.$transaction([
      prisma.mxGearOwned.updateMany({ where: { id: { in: conflicts } }, data: { equipped: false } }),
      prisma.mxGearOwned.update({ where: { id: owned.id }, data: { equipped: true } }),
    ]);
  }
  revalidatePath("/me");
  revalidatePath("/today");
}
