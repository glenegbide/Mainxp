"use client";

// Inviting someone is one gesture: name them, get a link, send it in whatever
// app you already talk to them in. No address book, no search, no discovery —
// you cannot be found in MAINXP, you can only be invited.

import { useState, useTransition } from "react";

export function InviteLink({
  create,
}: {
  create: (label: string) => Promise<{ token: string }>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function make() {
    startTransition(async () => {
      const { token } = await create(label.trim());
      const link = `${window.location.origin}/social/rejoindre/${token}`;
      setUrl(link);
      // The share sheet is the natural next step on a phone; a refusal is not
      // an error, the link stays on screen either way.
      try {
        if (navigator.share) {
          await navigator.share({
            title: "MAINXP",
            text: label.trim()
              ? `${label.trim()} — on se tient au courant de nos objectifs ?`
              : "On se tient au courant de nos objectifs ?",
            url: link,
          });
        }
      } catch {
        /* dismissed — nothing to repair */
      }
    });
  }

  if (url) {
    return (
      <div className="mt-4">
        <p className="mxp-body">Ton lien est prêt. Envoie-le à cette personne.</p>
        <p className="mxp-meta mt-2 break-all rounded-xl bg-mxp-bg px-3 py-2">{url}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="mxp-btn flex-1 py-3 text-[15px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copié" : "Copier le lien"}
          </button>
          <button
            type="button"
            className="mxp-btn-ghost px-4 text-sm"
            onClick={() => {
              setUrl(null);
              setLabel("");
            }}
          >
            Autre
          </button>
        </div>
        <p className="mxp-meta mt-2">
          Valable 14 jours, une seule personne. Tant que tu n&apos;ouvres rien, elle ne voit
          que ton prénom.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="block">
        <span className="mxp-meta">Pour qui ?</span>
        <input
          type="text"
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Marc, mon frère…"
          className="mt-1 w-full mxp-input px-4"
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={make}
        className="mxp-btn mt-2 w-full py-3 text-[15px]"
      >
        {pending ? "Création…" : "Créer le lien"}
      </button>
    </div>
  );
}
