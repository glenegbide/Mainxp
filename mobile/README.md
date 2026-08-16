# MAINXP — native shell (Capacitor)

The App Store / Play Store path (roadmap Phase 5). This folder wraps the live
web app (`https://mainxp.vercel.app`) in a native shell and adds native
capabilities. Because the shell loads the deployed site, **every web deploy
updates the mobile app instantly** — store re-submission is only needed when
the native shell itself changes.

Already wired:

- iOS + Android projects (`ios/`, `android/`), app id `app.mainxp.mobile`
- Plugins bundled: Haptics, Local Notifications, Push Notifications, App
- Web-side bridge (`src/app/components/NativeBridge.tsx`): haptic ticks on
  game taps + baseline morning (07:30) / evening (21:30) reminders — silent
  no-op in ordinary browsers

## Build & run (requires your machine — not possible from CI)

```bash
cd mobile && npm install && npx cap sync
```

### Android (any OS; Play Store account $25 one-time)
1. Install Android Studio → `npx cap open android`
2. Run on a device/emulator; for release: Build → Generate Signed Bundle (AAB),
   then upload in Play Console.

### iOS (requires a Mac + Xcode; Apple Developer $99/year)
1. `npx cap open ios` → set your Team under Signing & Capabilities
2. Run on your iPhone; for TestFlight/App Store: Product → Archive → Distribute.

## Passing App Store review (guideline 4.2 — plan)

A plain wrapped website gets rejected. This shell already adds haptics and
scheduled reminders; before submission, add at least:

1. **Push notifications** (plugin bundled): server-driven contextual nudges via
   APNs/FCM — replaces the baseline local reminders (docs/NOTIFICATION_SYSTEM.md).
2. **App badge** with open Main Quest state.
3. **Home-screen widget** (small native work): today's Main Quest + Élan.
4. Later, the spec's screen-time integration (docs, Part 46) — a genuinely
   native capability web cannot offer.

Play Store accepts the current state essentially as-is (TWA-equivalent).

## Notes

- Icons/splash: regenerate native assets from `public/icon-512.png` with
  `npx @capacitor/assets generate` when preparing a release.
- The reminder times are the Phase-5 baseline; wire them to user settings
  (quiet hours, notification mode) before store release.
