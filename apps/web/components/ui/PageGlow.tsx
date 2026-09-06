/**
 * Ambient background glow reused on every interior page (dashboard, org,
 * event control room, etc.) so the site doesn't read as "homepage has all
 * the atmosphere, everything else is a plain flat panel." Fixed (not
 * absolute) since these pages don't need scroll parallax — it just sits
 * behind the content for the life of the viewport.
 */
export function PageGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-32 right-[-12%] h-[520px] w-[720px] rounded-full bg-shu-500/[0.10] blur-[150px]" />
      <div className="absolute bottom-[-18%] left-[-12%] h-[480px] w-[680px] rounded-full bg-kehai-500/[0.08] blur-[150px]" />
    </div>
  );
}
