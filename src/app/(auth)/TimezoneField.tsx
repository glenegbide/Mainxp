"use client";

/** Hidden field auto-filled with the browser's IANA timezone (server validates). */
export function TimezoneField() {
  return (
    <input
      type="hidden"
      name="timezone"
      defaultValue="Europe/Zurich"
      ref={(el) => {
        if (!el) return;
        try {
          el.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich";
        } catch {
          /* keep default */
        }
      }}
    />
  );
}
