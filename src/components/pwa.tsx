"use client";
import { useEffect, useState } from "react";
import { Download, Smartphone, WifiOff, Share, PlusSquare } from "lucide-react";
import { Modal } from "./ui";
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function Pwa() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <div className="offline-banner" role="alert">
      <WifiOff size={15} /> You’re offline. Trading is paused until you
      reconnect.
    </div>
  ) : null;
}
export function InstallButton({ full = false }: { full?: boolean }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [help, setHelp] = useState(false),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    const capture = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", capture);
    const complete = () => {
      setPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setHelp(true);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }
  if (installed)
    return (
      <span className="installed-label">
        <Smartphone size={14} /> App installed
      </span>
    );
  return (
    <>
      <button
        className={full ? "button secondary" : "text-button install-button"}
        onClick={install}
      >
        <Download size={15} /> Install app
      </button>
      <Modal
        open={help}
        onOpenChange={setHelp}
        title="FomoLabs, always within reach"
        description="Install the app for a focused, full-screen experience."
      >
        <div className="install-preview">
          <img
            src="/brand/icon-192.png"
            width="68"
            height="68"
            alt="FomoLabs icon"
          />
          <div>
            <strong>FomoLabs</strong>
            <p>Trade. Discover. Go further.</p>
          </div>
        </div>
        <div className="install-steps">
          <p>
            <Share size={18} />
            <span>
              <strong>iPhone or iPad</strong>Open in Safari, tap Share, then Add
              to Home Screen.
            </span>
          </p>
          <p>
            <PlusSquare size={18} />
            <span>
              <strong>Android or desktop</strong>Open in Chrome or Edge, then
              select Install app from the browser menu.
            </span>
          </p>
        </div>
        <p className="fineprint">
          For mobile wallet approval, open FomoLabs in your wallet’s browser if
          your installed app cannot connect.
        </p>
      </Modal>
    </>
  );
}
