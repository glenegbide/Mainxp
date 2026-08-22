"use client";

// The composer + the waiting state. The coach reads the ledger and can call
// tools before answering, which takes seconds — silence during those seconds
// is what made it feel broken. The form stays disabled while it thinks, and
// says what is actually happening instead of showing a spinner.

import { useFormStatus } from "react-dom";

function Controls() {
  const { pending } = useFormStatus();
  return (
    <>
      <input
        type="text"
        name="text"
        required
        disabled={pending}
        maxLength={4000}
        placeholder={pending ? "Il lit tes chiffres…" : "Parle à ton coach…"}
        autoComplete="off"
        className="min-w-0 flex-1 mxp-input px-4 py-3 text-sm disabled:opacity-60"
      />
      <button
        disabled={pending}
        aria-label="Envoyer"
        className="mxp-btn px-4 py-3 text-sm disabled:opacity-60"
      >
        {pending ? "…" : "→"}
      </button>
    </>
  );
}

export function CoachComposer({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="sticky bottom-16 flex gap-2 bg-mxp-bg pb-3 pt-1">
      <Controls />
    </form>
  );
}

/** A suggested question: one tap sends it for real — no copy-typing. */
export function QuestionChip({
  action,
  question,
}: {
  action: (formData: FormData) => Promise<void>;
  question: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="text" value={question} />
      <ChipButton question={question} />
    </form>
  );
}

function ChipButton({ question }: { question: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-xl border border-mxp-line bg-mxp-card px-4 py-3 text-left text-sm font-medium transition hover:border-mxp-purple/40 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Il lit tes chiffres…" : question}
    </button>
  );
}
