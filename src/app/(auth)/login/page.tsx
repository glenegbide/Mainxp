import Link from "next/link";
import { login } from "../actions";

const ERRORS: Record<string, string> = {
  credentials: "Email ou mot de passe incorrect.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center">
        <div
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white shadow-lg"
          style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 14px 30px -12px rgba(109,40,217,.7)" }}
        >
          ⚡
        </div>
        <p className="mt-3 font-displaymx text-3xl font-bold tracking-tight">
          MAIN<span className="text-mxp-purple">XP</span>
        </p>
      </div>
      <p className="mt-2 text-center text-sm text-mxp-muted">
        Ta vie est la quête principale.
      </p>

      <form action={login} className="mt-10 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-mxp-red">
            {ERRORS[error] ?? "Une erreur est survenue."}
          </p>
        )}
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full mxp-input px-4 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full mxp-btn px-4 py-3 text-sm"
        >
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mxp-muted">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-mxp-purple">
          Commencer à zéro
        </Link>
      </p>
    </main>
  );
}
