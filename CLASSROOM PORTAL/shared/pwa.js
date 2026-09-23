// BSIS 1-A PWA bootstrap.
// Authentication and Supabase data remain online-first; the service worker only
// provides the local app shell and static asset fallback.
(function initBSISPWA() {
  const installHost = document.body.classList.contains("home-page");

  function hideInstallControls() {
    document.querySelectorAll("[data-install-app]").forEach(button => {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
    });
  }

  if (!installHost) {
    document.addEventListener("DOMContentLoaded", hideInstallControls);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("../sw.js", document.baseURI))
        .catch(error => console.warn("BSIS PWA service worker registration failed:", error));
    });
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    if (!installHost) return;
    document.querySelectorAll("[data-install-app]").forEach(button => {
      button.hidden = false;
      button.removeAttribute("aria-hidden");
    });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    document.querySelectorAll("[data-install-app]").forEach(button => {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
    });
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-install-app]");
    if (!button || !deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
  });

  if (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true) {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("[data-install-app]").forEach(button => {
        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
      });
    });
  }
})();
