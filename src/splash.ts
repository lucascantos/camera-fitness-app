// Exit for the opening splash in index.html, which starts as a copy of
// Android's launch screen (background colour + the icon in a circle). Called
// once the app is ready: the character fades, the corners fly off with
// easeInBack, the icon's disc and the background give way to the theme's
// background, then the splash fades and is removed so the app shows through.
// All the motion is CSS (#splash.sp-exit).
//
// The splash stays up for at least MIN_SHOW_MS from page start, so a fast,
// cached load still reads as a beat after Android's screen, not a flash.

const MIN_SHOW_MS = 500;
const EXIT_MS = 900;   // longest transition: 550 ms delay + 300 ms fade, plus slack

let dismissed = false;

export function dismissSplash(): void {
  const el = document.getElementById("splash");
  if (!el || dismissed) return;
  dismissed = true;
  const wait = Math.max(0, MIN_SHOW_MS - performance.now());
  setTimeout(() => {
    el.classList.add("sp-exit");
    setTimeout(() => el.remove(), EXIT_MS);
  }, wait);
}
