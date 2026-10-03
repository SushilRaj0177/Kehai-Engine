// Shared by the server layout (the inline boot script) and lib/theme.ts.
// No client-only imports here, so the root layout can import it.

export type Theme = "light" | "dark";

export const THEME_KEY = "kehai.theme";

/** Status-bar / page ground colour for each theme (also the <meta name="theme-color">). */
export const THEME_GROUND: Record<Theme, string> = { dark: "#05070a", light: "#f6f4ef" };

// Runs inline in <head>, before the first paint, so the installed app never
// shows a frame of the wrong theme. Kept dependency-free and tiny on purpose;
// applyTheme() below does the same thing after hydration.
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true,c="system";try{c=localStorage.getItem("${THEME_KEY}")||"system"}catch(e){}var t=s&&(c==="light"||(c!=="dark"&&matchMedia("(prefers-color-scheme: light)").matches))?"light":"dark";d.dataset.theme=t;if(t==="light"){d.style.backgroundColor="${THEME_GROUND.light}";d.style.colorScheme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${THEME_GROUND.light}")}}catch(e){}})();`;

