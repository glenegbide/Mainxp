"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { destroySession, requireMxUser } from "@/lib/mainxp/auth";
import { awardXp, xpTotals } from "@/lib/mainxp/xp/ledger";
import { gearById, slotOf } from "@/lib/mainxp/gear";

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

  const tx = await awardXp({
    userId: user.id,
    sourceType: "gear_purchase",
    sourceId: gearId,
    reason: `Équipement acquis : ${gear.name}`,
    mainDelta: 0,
    coinsDelta: -gear.costCoins,
    idempotencyKey: `gear:${user.id}:${gearId}`,
    timezone: user.timezone,
  });
  if (!tx) return;

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
