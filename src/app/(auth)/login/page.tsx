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
      <p className="text-center text-3xl font-semibold tracking-tight text-mxp-purple">MAINXP</p>
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
            className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-sm outline-none focus:border-mxp-purple"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-sm outline-none focus:border-mxp-purple"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-mxp-purple px-4 py-3 text-sm font-semibold text-white transition hover:bg-mxp-purple-deep"
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
