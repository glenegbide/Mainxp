import Link from "next/link";
import { checkResetToken, MIN_PASSWORD } from "@/lib/mainxp/password-reset";
import { submitNewPassword } from "../../reset-actions";

// Reading this page checks the token and changes nothing. The password only
// moves on submit — and using the link ends every session, everywhere.
const ERRORS: Record<string, string> = {
  confirmation: "Les deux mots de passe ne sont pas identiques.",
  weak_password: `Choisis un mot de passe d'au moins ${MIN_PASSWORD} caractères.`,
  expired: "Ce lien a expiré. Demandes-en un nouveau.",
  used: "Ce lien a déjà servi. Demandes-en un nouveau.",
  unknown: "Ce lien n'est pas valable. Demandes-en un nouveau.",
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { token } = await params;
  const { erreur } = await searchParams;
  const state = await checkResetToken(token);

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center">
        <p className="font-displaymx text-3xl font-bold tracking-tight">
          MAIN<span className="text-mxp-purple">XP</span>
        </p>
      </div>

      <h1 className="mt-8 text-center text-xl font-semibold">Nouveau mot de passe</h1>

      {state !== "valid" ? (
        <>
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-mxp-red">
            {ERRORS[state]}
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="mt-6 w-full mxp-btn px-4 py-3 text-center text-sm"
          >
            Demander un nouveau lien
          </Link>
        </>
      ) : (
        <form action={submitNewPassword} className="mt-8 space-y-4">
          <input type="hidden" name="token" value={token} />
          {erreur && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-mxp-red">
              {ERRORS[erreur] ?? "Une erreur est survenue."}
            </p>
          )}
          <label className="block">
            <span className="text-sm font-medium">Nouveau mot de passe</span>
            <input
              type="password"
              name="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              autoFocus
              className="mt-1 w-full mxp-input px-4 py-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Encore une fois</span>
            <input
              type="password"
              name="confirm"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              className="mt-1 w-full mxp-input px-4 py-3 text-sm"
            />
          </label>
          <button type="submit" className="w-full mxp-btn px-4 py-3 text-sm">
            Enregistrer
          </button>
          <p className="text-xs text-mxp-muted">
            Enregistrer déconnecte MAINXP sur tous tes appareils — c&apos;est ce qui met
            dehors quiconque aurait eu ton ancien mot de passe.
          </p>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-mxp-muted">
        <Link href="/login" className="font-medium text-mxp-purple">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
