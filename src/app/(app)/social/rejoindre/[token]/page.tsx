import Link from "next/link";
import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { previewInvite, type CircleError } from "@/lib/mainxp/circle/service";
import { joinCircle } from "../../actions";

// Opening an invitation must CHANGE NOTHING. This page only reads: the link
// becomes a link between two people when a signed-in person presses the
// button — a POST, an explicit act. (Message apps and mail clients prefetch
// URLs; a GET that accepted would connect people who never opened anything.)

const MESSAGES: Record<CircleError, string> = {
  unknown: "Ce lien n'existe pas. Demande-lui de t'en envoyer un nouveau.",
  revoked: "Ce lien a été annulé par la personne qui te l'a envoyé.",
  used: "Ce lien a déjà été utilisé — un lien ne relie que deux personnes.",
  expired: "Ce lien a expiré. Demande-lui de t'en renvoyer un.",
  self: "C'est ton propre lien : envoie-le à quelqu'un d'autre.",
  blocked: "Ce lien ne peut pas être accepté.",
  already: "Vous êtes déjà liés — tout se passe dans Le Cercle.",
  full: "L'un de vous a déjà atteint le maximum de six personnes.",
};

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await getMxUser();
  const { token } = await params;
  const { erreur } = await searchParams;
  if (!user)
    redirect(
      `/login?suite=${encodeURIComponent(`/social/rejoindre/${token}`)}`,
    );

  const preview = await previewInvite(token);
  const failure = (erreur as CircleError | undefined) ?? preview.error;

  if (failure || preview.error) {
    return (
      <main className="px-4 pt-5 pb-8">
        <h1 className="mxp-display">Une invitation</h1>
        <section className="mt-5 mxp-card p-5">
          <p className="mxp-body">
            {MESSAGES[failure ?? "unknown"] ?? MESSAGES.unknown}
          </p>
          <Link
            href="/social"
            className="mxp-btn-ghost mt-4 inline-block px-4 py-2 text-sm"
          >
            Aller au Cercle
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="px-4 pt-5 pb-8">
      <h1 className="mxp-display">Une invitation</h1>

      <section className="mt-5 mxp-anchor">
        <p className="mxp-label text-mxp-purple">Cercle de responsabilité</p>
        <p className="mt-2 mxp-title">{preview.inviter.name} t&apos;invite.</p>
        <p className="mxp-body mt-3">
          Si tu acceptes, vous serez liés — et chacun ne verra que le prénom de
          l&apos;autre. Rien d&apos;autre ne circule tant que vous ne
          l&apos;ouvrez pas vous-mêmes, un réglage à la fois.
        </p>
        <form action={joinCircle} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <button className="mxp-btn w-full py-3 text-[15px]">
            Accepter l&apos;invitation
          </button>
        </form>
        <Link href="/today" className="mxp-quiet mt-2 block text-center">
          Pas maintenant
        </Link>
        <p className="mxp-meta mt-4">
          Ton journal, ta gratitude, ton argent et tes échanges avec le coach ne
          sont partageables par aucun réglage.
        </p>
      </section>
    </main>
  );
}
