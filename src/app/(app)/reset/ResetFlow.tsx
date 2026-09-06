"use client";

// LE RESET, 60 secondes — one question per screen, big targets, zero typing
// unless the user wants to. The submit is a plain form: the flow only
// assembles its hidden fields.

import { useMemo, useState } from "react";
import { MAX_FREQUENCIES, STATES, TRIGGERS } from "@/lib/mainxp/reset-def";

export interface ResetPattern {
  id: string;
  fromLabel: string;
  toLabel: string;
  trigger: string;
  newResponse: string;
}

const RESET_STATES = ["focus", "calme", "abondance", "courage", "discipline"] as const;
void MAX_FREQUENCIES; // (frequencies are the morning's use of the same STATES)

export function ResetFlow({
  patterns,
  questTitle,
  questNextAction,
  act,
}: {
  patterns: ResetPattern[];
  questTitle: string | null;
  questNextAction: string | null;
  act: (formData: FormData) => Promise<void>;
}) {
  const [trigger, setTrigger] = useState<string | null>(null);
  const [patternId, setPatternId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [action, setAction] = useState("");

  const step = trigger === null ? 1 : state === null ? 2 : 3;
  const pattern = patterns.find((p) => p.id === patternId) ?? null;

  const suggestions = useMemo(() => {
    const out: string[] = [];
    if (pattern?.newResponse) out.push(pattern.newResponse);
    if (questNextAction) out.push(questNextAction);
    else if (questTitle) out.push(`10 minutes d'Arène sur : ${questTitle}`);
    if (state && STATES[state]) out.push(STATES[state].means);
    return [...new Set(out)].slice(0, 3);
  }, [pattern, questNextAction, questTitle, state]);

  return (
    <div>
      <div aria-hidden className="mb-5 flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-mxp-teal" : "bg-mxp-line"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <section>
          <h2 className="mxp-title">Qu&apos;est-ce qui se passe ?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(TRIGGERS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTrigger(key);
                  // The old pattern often names itself from the trigger word.
                  const match = patterns.find((p) =>
                    p.trigger.toLowerCase().includes(label.toLowerCase())
                  );
                  if (match) setPatternId(match.id);
                  if (typeof navigator !== "undefined") navigator.vibrate?.(5);
                }}
                className="rounded-2xl border border-mxp-line bg-white px-4 py-4 text-[15px] font-semibold transition active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mxp-meta mt-4">Le nommer lui enlève déjà la moitié de son poids.</p>
        </section>
      )}

      {step === 2 && (
        <section>
          {patterns.length > 0 && (
            <div className="mb-5">
              <p className="mxp-meta">Un vieux pattern est-il aux commandes ?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patterns.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatternId(patternId === p.id ? null : p.id)}
                    className={`mxp-chip border transition active:scale-95 ${
                      patternId === p.id
                        ? "border-mxp-teal bg-mxp-teal/10 text-mxp-teal"
                        : "border-mxp-line bg-white text-mxp-muted"
                    }`}
                  >
                    {p.fromLabel} → {p.toLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
          <h2 className="mxp-title">Qui choisis-tu d&apos;être, maintenant ?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {RESET_STATES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setState(key);
                  if (typeof navigator !== "undefined") navigator.vibrate?.(5);
                }}
                className="rounded-2xl border border-mxp-line bg-white px-4 py-4 text-[15px] font-semibold text-mxp-teal transition active:scale-95"
              >
                {STATES[key].label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && state && (
        <section>
          <h2 className="mxp-title">Un seul geste, tout de suite.</h2>
          <p className="mxp-meta mt-1">
            {STATES[state].label}, là, ça veut dire : {STATES[state].means}.
          </p>
          <div className="mt-4 space-y-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAction(s)}
                className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                  action === s
                    ? "border-mxp-teal bg-mxp-teal/10 text-mxp-teal"
                    : "border-mxp-line bg-white"
                }`}
              >
                → {s}
              </button>
            ))}
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              maxLength={200}
              placeholder="Ou écris ton geste — « Appeler un propriétaire »…"
              className="mxp-input w-full px-4 py-3 text-sm"
            />
          </div>

          <form action={act} className="mt-5">
            <input type="hidden" name="trigger" value={trigger ?? ""} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="patternId" value={patternId ?? ""} />
            <input type="hidden" name="action" value={action} />
            <button className="mxp-btn mxp-btn-teal w-full py-3.5 text-[15px]">
              C&apos;est parti
            </button>
          </form>
        </section>
      )}

      {step > 1 && (
        <button
          type="button"
          onClick={() => (step === 3 ? setState(null) : setTrigger(null))}
          className="mxp-meta mt-5"
        >
          ← revenir
        </button>
      )}
    </div>
  );
}
