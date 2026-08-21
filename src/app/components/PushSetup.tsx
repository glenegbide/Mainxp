"use client";

// Permission is one-shot on iOS: "Don't Allow" can only be undone in iOS
// Settings. So this component is honest about where it is:
//   - not installed to the home screen → PushManager doesn't exist → explain
//   - installed → one clear button, and requestPermission() is called FIRST in
//     the handler (any await before it consumes the gesture on WebKit and the
//     prompt silently never appears).

import { useCallback, useState, useSyncExternalStore } from "react";
import { removeSubscription, saveSubscription } from "../(app)/me/notifications/actions";

type State = "checking" | "unsupported" | "not-installed" | "ready" | "granted" | "denied" | "working";

// The browser's push capability is an external system, so it is *read*, never
// mirrored into state by an effect: the server renders "checking", the client
// swaps in the truth on its first paint, and nothing cascades.
const subscribeNoop = () => () => {};

function readEnvironment(active: boolean): State {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for home-screen apps
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return standalone ? "unsupported" : "not-installed";
  }
  if (Notification.permission === "denied") return "denied";
  if (active && Notification.permission === "granted") return "granted";
  return "ready";
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function PushSetup({ vapidPublicKey, active }: { vapidPublicKey: string; active: boolean }) {
  const getSnapshot = useCallback(() => readEnvironment(active), [active]);
  const environment = useSyncExternalStore(subscribeNoop, getSnapshot, () => "checking" as State);
  // What the user just did wins over what the browser said on arrival.
  const [chosen, setChosen] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = chosen ?? environment;
  const setState = setChosen;

  async function enable() {
    setError(null);
    // MUST be first — no await before this line.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "ready");
      return;
    }
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // iOS rejects silent push
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await saveSubscription({
        endpoint: json.endpoint ?? "",
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setState("granted");
    } catch (e) {
      setError("L'abonnement a échoué. Réessaie dans un instant.");
      setState("ready");
      console.error(e);
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("ready");
    } catch {
      setState("granted");
    }
  }

  if (state === "checking") return <div className="mxp-skel mt-4 h-[52px]" />;

  if (state === "not-installed") {
    return (
      <div className="mt-4">
        <p className="mxp-body">
          Pour recevoir des notifications, ouvre MAINXP depuis l&apos;icône de ton écran
          d&apos;accueil.
        </p>
        <p className="mxp-meta mt-2">
          Safari → bouton Partager → « Sur l&apos;écran d&apos;accueil ». iOS ne les autorise
          que depuis l&apos;app installée — ce n&apos;est pas une limite de MAINXP.
        </p>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="mxp-body mt-4 text-mxp-muted">
        Ce navigateur ne gère pas les notifications push. Rien n&apos;est cassé — le reste de
        MAINXP fonctionne normalement.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <div className="mt-4">
        <p className="mxp-body">Les notifications sont bloquées pour MAINXP.</p>
        <p className="mxp-meta mt-2">
          iOS ne permet de le changer que dans Réglages → Notifications → MAINXP.
        </p>
      </div>
    );
  }

  if (state === "granted") {
    return (
      <div className="mt-4">
        <p className="mxp-body">✓ Notifications actives sur cet appareil.</p>
        <button onClick={disable} className="mxp-quiet mt-2">
          Désactiver sur cet appareil
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={enable}
        disabled={state === "working"}
        className="mxp-btn w-full py-3.5 text-[15px]"
      >
        {state === "working" ? "Activation…" : "Activer les notifications"}
      </button>
      {error && <p className="mxp-meta mt-2 text-mxp-red">{error}</p>}
    </div>
  );
}
