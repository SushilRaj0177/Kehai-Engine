"use client";

/**
 * Ambient background glow reused on every interior page (dashboard, org,
 * event control room, etc.) so the site doesn't read as "homepage has all
 * the atmosphere, everything else is a plain flat panel." Fixed (not
 * absolute) since these pages don't need scroll parallax — it just sits
 * behind the content for the life of the viewport.
 *
 * The brighter 0.26-opacity version was a PWA-specific request, but this
 * component renders on every route regardless of how it's opened -- there
 * is no separate "PWA-only" page, only a shared one whose surrounding nav
 * chrome differs. Without gating, the brighter glow leaked into every
 * plain mobile-browser-tab visit too. [data-standalone="true"] on <html>
 * (set by StandaloneModeFlag) scopes the brighter version to the
 * installed app; a browser tab keeps the original, dimmer glow.
 */
export function PageGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="page-glow-shu absolute -top-32 right-[-12%] h-[520px] w-[720px] rounded-full" />
      <div className="page-glow-kehai absolute bottom-[-18%] left-[-12%] h-[480px] w-[680px] rounded-full" />
    </div>
  );
}
