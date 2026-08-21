import Link from "next/link";
import { askPasswordReset } from "../reset-actions";

// One job: get a link into the right inbox. The confirmation is deliberately
// the same sentence whether or not an account exists — a recovery form must
// never become a way to test whether someone uses MAINXP.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  const { etat } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center">
        <p className="font-displaymx text-3xl font-bold tracking-tight">
          MAIN<span className="text-mxp-purple">XP</span>
        </p>
      </div>

      <h1 className="mt-8 text-center text-xl font-semibold">Mot de passe oublié</h1>

      {etat === "envoye" ? (
        <>
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-mxp-green">
            Si un compte MAINXP utilise cette adresse, un lien vient de partir. Il est
            valable une heure et ne fonctionne qu&apos;une fois.
          </p>
          <p className="mt-3 text-sm text-mxp-muted">
            Rien reçu après deux minutes ? Vérifie les spams, et que c&apos;est bien
            l&apos;adresse de ton compte.
          </p>
        </>
      ) : (
        <>
          {etat === "indisponible" && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-mxp-red">
              L&apos;envoi d&apos;emails n&apos;est pas configuré sur ce serveur — aucun lien
              n&apos;a pu partir. (Variables <code>RESEND_API_KEY</code> et{" "}
              <code>MAINXP_EMAIL_FROM</code>.)
            </p>
          )}
          <p className="mt-3 text-center text-sm text-mxp-muted">
            Ton adresse email, et on t&apos;envoie un lien pour en choisir un nouveau.
          </p>
          <form action={askPasswordReset} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                className="mt-1 w-full mxp-input px-4 py-3 text-sm"
              />
            </label>
            <button type="submit" className="w-full mxp-btn px-4 py-3 text-sm">
              Envoyer le lien
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-mxp-muted">
        <Link href="/login" className="font-medium text-mxp-purple">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
