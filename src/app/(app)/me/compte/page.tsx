import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/mainxp/email";
import { MIN_PASSWORD } from "@/lib/mainxp/password-reset";
import {
  deleteAccount,
  saveEmail,
  saveName,
  savePassword,
  signOutEverywhere,
} from "./actions";

// Le compte : le nom que ton cercle voit, l'adresse qui te connecte, le mot de
// passe, les appareils. Une seule règle : tout ce qui touche à l'identité
// demande le mot de passe actuel — savoir ouvrir l'app ne suffit pas.

const MESSAGES: Record<string, { tone: "ok" | "bad"; text: string }> = {
  nom: { tone: "ok", text: "Nom mis à jour." },
  email: { tone: "ok", text: "Adresse mise à jour — c'est elle qui te connecte maintenant." },
  mdp: { tone: "ok", text: "Mot de passe changé. Les autres appareils ont été déconnectés." },
  sessions: { tone: "ok", text: "Tous les autres appareils ont été déconnectés." },
  nom_invalide: { tone: "bad", text: "Il faut un nom (100 caractères maximum)." },
  mdp_incorrect: { tone: "bad", text: "Mot de passe actuel incorrect." },
  mdp_court: { tone: "bad", text: `Au moins ${MIN_PASSWORD} caractères.` },
  mdp_confirmation: { tone: "bad", text: "Les deux mots de passe ne sont pas identiques." },
  email_invalide: { tone: "bad", text: "Cette adresse n'a pas l'air valide." },
  email_identique: { tone: "bad", text: "C'est déjà ton adresse actuelle." },
  email_pris: { tone: "bad", text: "Un compte utilise déjà cette adresse." },
  suppression_confirmation: { tone: "bad", text: "Tape SUPPRIMER en toutes lettres pour confirmer." },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  const { etat } = await searchParams;
  const message = etat ? MESSAGES[etat] : undefined;

  const [sessions, devices] = await Promise.all([
    prisma.mxSession.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    prisma.mxPushSubscription.count({ where: { userId: user.id, disabledAt: null } }),
  ]);

  return (
    <main className="px-4 pt-5 pb-8">
      <Link href="/me" className="mxp-meta">← Moi</Link>
      <h1 className="mt-3 mxp-display">Compte</h1>
      <p className="mxp-meta mt-1">
        Ton nom, ton adresse, ton mot de passe, tes appareils.
      </p>

      {message && (
        <p
          className={`mxp-body mt-4 rounded-2xl px-4 py-3 ${
            message.tone === "ok" ? "bg-emerald-50 text-mxp-green" : "bg-red-50 text-mxp-red"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* ── The name is the anchor: it is what other people see of you. ── */}
      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">Ton nom</p>
        <p className="mxp-meta mt-1">
          C&apos;est ce que voit ton cercle, et comment le coach t&apos;appelle.
        </p>
        <form action={saveName} className="mt-3 flex gap-2">
          <input
            type="text"
            name="name"
            required
            maxLength={100}
            defaultValue={user.name}
            className="min-w-0 flex-1 mxp-input px-4"
          />
          <button className="mxp-btn px-5 text-sm">Enregistrer</button>
        </form>
      </section>

      {/* ── Email ── */}
      <section className="mt-6">
        <p className="mxp-label text-mxp-muted">Adresse email</p>
        <p className="mxp-meta mt-1">
          C&apos;est ton identifiant de connexion — et l&apos;adresse qui reçoit le lien si
          tu oublies ton mot de passe. Actuelle : <strong>{user.email}</strong>
        </p>
        <form action={saveEmail} className="mt-3 space-y-2">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="nouvelle@adresse.ch"
            className="w-full mxp-input px-4"
          />
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            placeholder="Ton mot de passe actuel"
            className="w-full mxp-input px-4"
          />
          <button className="mxp-btn-ghost w-full py-3 text-sm">Changer d&apos;adresse</button>
        </form>
        {!emailConfigured() && (
          <p className="mxp-meta mt-2">
            Note : l&apos;envoi d&apos;emails n&apos;est pas encore configuré sur ce serveur,
            donc la récupération de mot de passe ne peut rien envoyer pour l&apos;instant.
          </p>
        )}
      </section>

      {/* ── Password ── */}
      <section className="mt-6">
        <p className="mxp-label text-mxp-muted">Mot de passe</p>
        <form action={savePassword} className="mt-2 space-y-2">
          <input
            type="password"
            name="current"
            required
            autoComplete="current-password"
            placeholder="Mot de passe actuel"
            className="w-full mxp-input px-4"
          />
          <input
            type="password"
            name="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            className="w-full mxp-input px-4"
          />
          <input
            type="password"
            name="confirm"
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            placeholder="Encore une fois"
            className="w-full mxp-input px-4"
          />
          <button className="mxp-btn-ghost w-full py-3 text-sm">Changer le mot de passe</button>
        </form>
        <p className="mxp-meta mt-2">
          Le changer déconnecte tous tes autres appareils, et annule les liens de
          récupération encore en circulation.
        </p>
      </section>

      {/* ── Devices ── */}
      <section className="mt-6">
        <p className="mxp-label text-mxp-muted">Appareils</p>
        <p className="mxp-meta mt-1 tabular-nums">
          {sessions === 1 ? "1 session ouverte" : `${sessions} sessions ouvertes`}
          {devices > 0 &&
            ` · ${devices === 1 ? "1 appareil reçoit" : `${devices} appareils reçoivent`} les notifications`}
        </p>
        <form action={signOutEverywhere} className="mt-2">
          <button className="mxp-btn-ghost w-full py-3 text-sm">
            Déconnecter les autres appareils
          </button>
        </form>
      </section>

      {/* ── Deletion: real, immediate, and gated behind two deliberate acts ── */}
      <details className="mt-9 mxp-card p-4">
        <summary className="mxp-body cursor-pointer list-none text-mxp-red">
          Supprimer mon compte
        </summary>
        <p className="mxp-meta mt-2">
          Tout part immédiatement : ton XP, ton journal, tes objectifs, tes défis, tes
          livres, tes liens du Cercle. Ce n&apos;est pas une mise en pause, et rien
          n&apos;est conservé « au cas où ». Il n&apos;y a pas de retour en arrière.
        </p>
        <form action={deleteAccount} className="mt-3 space-y-2">
          <input
            type="password"
            name="deletePassword"
            required
            autoComplete="current-password"
            placeholder="Ton mot de passe"
            className="w-full mxp-input px-4"
          />
          <input
            type="text"
            name="deleteConfirm"
            required
            placeholder="Tape SUPPRIMER"
            className="w-full mxp-input px-4"
          />
          <button className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-mxp-red">
            Supprimer définitivement
          </button>
        </form>
      </details>
    </main>
  );
}
