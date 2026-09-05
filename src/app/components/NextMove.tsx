"use client";

// THE NEXT MOVE — the anti-procrastination primitive.
//
// A Main Quest says WHAT counts; the next move says the smallest PHYSICAL
// action that starts it («Appeler Marc», never «avancer le dossier»).
// When it's set, it reads as an arrow you can act on. When it's not, the
// button asks the only useful question. Same manners as NoteAction: opens
// in place, saves on blur, Escape abandons.

import { useRef, useState, useTransition } from "react";

export function NextMove({
  id,
  value,
  save,
}: {
  id: string;
  value: string;
  save: (id: string, value: string) => Promise<{ ok: boolean }>;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const box = useRef<HTMLInputElement>(null);
  const [committed, setCommitted] = useState(value);

  const [lastServer, setLastServer] = useState(value);
  if (value !== lastServer && !open) {
    setLastServer(value);
    setText(value);
    setCommitted(value);
  }

  function commit() {
    const v = text.trim();
    setOpen(false);
    if (v === committed) return;
    setCommitted(v);
    setFailed(false);
    startTransition(async () => {
      const r = await save(id, v);
      if (!r.ok) setFailed(true);
    });
  }

  if (open) {
    return (
      <input
        ref={box}
        autoFocus
        type="text"
        maxLength={200}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText(committed);
            setOpen(false);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            box.current?.blur();
          }
        }}
        aria-label="Le prochain geste"
        placeholder="Le plus petit geste physique — « Appeler Marc »…"
        className="mxp-input mt-2 w-full px-3 py-2 text-sm"
      />
    );
  }

  if (text.trim()) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Modifier le prochain geste — ${text.trim()}`}
        className="mt-2 flex items-center gap-1.5 text-left text-[14px] font-medium text-mxp-blue"
      >
        <span aria-hidden>→</span>
        {text.trim()}
        {failed && <span className="mxp-meta text-mxp-red"> · pas enregistré</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mxp-noteadd mt-1.5"
    >
      → quel est le prochain geste ?
    </button>
  );
}
