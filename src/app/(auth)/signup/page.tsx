import Link from "next/link";
import { signup } from "../actions";
import { TimezoneField } from "../TimezoneField";

const ERRORS: Record<string, string> = {
  name: "Merci d'indiquer ton prénom.",
  email: "Adresse email invalide.",
  password: "Le mot de passe doit contenir au moins 8 caractères.",
  exists: "Un compte existe déjà avec cet email.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <p className="text-center text-3xl font-semibold tracking-tight text-mxp-purple">MAINXP</p>
      <p className="mt-2 text-center text-sm text-mxp-muted">
        Tout le monde commence à zéro. Niveau 1 · Novice · 0 XP.
      </p>

      <form action={signup} className="mt-10 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-mxp-red">
            {ERRORS[error] ?? "Une erreur est survenue."}
          </p>
        )}
        <TimezoneField />
        <label className="block">
          <span className="text-sm font-medium">Prénom</span>
          <input
            type="text"
            name="name"
            required
            maxLength={100}
            autoComplete="given-name"
            className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-sm outline-none focus:border-mxp-purple"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-sm outline-none focus:border-mxp-purple"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-sm outline-none focus:border-mxp-purple"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-mxp-purple px-4 py-3 text-sm font-semibold text-white transition hover:bg-mxp-purple-deep"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mxp-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-mxp-purple">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
