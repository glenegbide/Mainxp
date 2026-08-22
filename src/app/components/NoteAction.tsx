"use client";

// The note at the moment of doing.
//
// Rule: writing must never be a detour. Collapsed it is one small line; open
// it is a field already focused; leaving it saves. There is no Save button,
// no modal, no navigation — the page never moves under you.
//
// It is deliberately the same object everywhere (habit, non-negotiable,
// routine step, gratitude, mission), so "leave yourself a word" is learned
// once and works forever.

import { useRef, useState, useTransition } from "react";

export function NoteAction({
  id,
  note,
  label,
  placeholder = "Comment ça s'est passé ?",
  save,
}: {
  id: string;
  note: string;
  /** What this note is attached to — for screen readers only. */
  label: string;
  placeholder?: string;
  save: (id: string, note: string) => Promise<{ ok: boolean }>;
}) {
  const [text, setText] = useState(note);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  // What the server currently holds. State, not a ref: the render decides
  // between "+ note" and the written note from it.
  const [committed, setCommitted] = useState(note);

  // The server is the truth when it changes underneath (another device, the
  // coach writing for you) — but never while you are typing into the field.
  const [lastServer, setLastServer] = useState(note);
  if (note !== lastServer && !open) {
    setLastServer(note);
    setText(note);
    setCommitted(note);
  }

  function commit() {
    const value = text.trim();
    setOpen(false);
    if (value === committed) return;
    setCommitted(value);
    setFailed(false);
    startTransition(async () => {
      const r = await save(id, value);
      if (r.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1400);
      } else {
        setFailed(true);
      }
    });
  }

  if (open) {
    return (
      <div className="mt-1.5">
        <textarea
          ref={box}
          autoFocus
          rows={2}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setText(committed);
              setOpen(false);
            }
            // ⌘/Ctrl+Enter closes the note the way a message would send.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              box.current?.blur();
            }
          }}
          aria-label={`Note — ${label}`}
          placeholder={placeholder}
          className="mxp-noteedit"
        />
      </div>
    );
  }

  if (text.trim()) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Modifier la note — ${label}`}
        className="mxp-note"
      >
        {text.trim()}
        {saved && <span className="mxp-note-flash"> · noté</span>}
        {failed && <span className="text-mxp-red"> · pas enregistré, retouche</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Ajouter une note — ${label}`}
      className="mxp-noteadd"
    >
      + note
    </button>
  );
}
