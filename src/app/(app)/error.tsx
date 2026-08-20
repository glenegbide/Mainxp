"use client";

// Errors always have recovery (master prompt §3). Never a dead end, never a
// stack trace: what happened, and the two ways out.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="px-4 pt-16 text-center">
      <h1 className="mxp-display">Quelque chose a lâché</h1>
      <p className="mxp-body mt-3 text-mxp-muted">
        Rien n&apos;est perdu — tes actions enregistrées sont intactes. Réessaie, ou
        reviens à ta journée.
      </p>
      <button onClick={reset} className="mxp-btn mt-7 w-full py-3.5 text-[15px]">
        Réessayer
      </button>
      <a href="/today" className="mxp-btn-ghost mt-2 flex w-full items-center justify-center text-sm">
        Retour à aujourd&apos;hui
      </a>
    </main>
  );
}
