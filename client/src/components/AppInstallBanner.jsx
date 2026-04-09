import { useEffect, useState } from "react";

export default function AppInstallBanner() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    setIsInstalled(Boolean(standalone));

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPromptEvent(event);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice.catch(() => null);
    setInstallPromptEvent(null);
  }

  if (isInstalled || dismissed || !installPromptEvent) {
    return null;
  }

  return (
    <section className="install-banner">
      <div className="install-banner-copy">
        <strong>Install Konnect4</strong>
        <p>Add Konnect4 to your home screen for a more app-like experience on Android.</p>
      </div>

      <div className="install-banner-actions">
        <button type="button" className="primary-button" onClick={handleInstall}>
          Install app
        </button>
        <button type="button" className="ghost-button" onClick={() => setDismissed(true)}>
          Maybe later
        </button>
      </div>
    </section>
  );
}
