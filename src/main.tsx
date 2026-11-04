import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";
import { sanitizeMonitoringEvent } from "./lib/monitoring";
import MonitoringErrorFallback from "./components/MonitoringErrorFallback";
import App from "./App.tsx";
import "./index.css";

// ---- Render IMMEDIATELY (no awaits before first paint) ----
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: sanitizeMonitoringEvent,
    beforeSendTransaction: sanitizeMonitoringEvent,
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("App root not found");
createRoot(root).render(
  <Sentry.ErrorBoundary fallback={<MonitoringErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>,
);

// ---- Service Worker setup runs in background, never blocks UI ----
function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function shouldRegisterSW() {
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (isInIframe()) return false;
  const h = window.location.hostname;
  if (h.includes("id-preview--") || h.endsWith(".lovableproject.com")) return false;
  return true;
}

async function unregisterAllSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
}

function notifyUpdateReady(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting) return;
  toast("Nova versão disponível", {
    description: "Atualize para ver as últimas melhorias.",
    duration: Infinity,
    action: {
      label: "Atualizar",
      onClick: () => {
        waiting.postMessage("SKIP_WAITING");
      },
    },
  });
}

async function setupServiceWorker() {
  if (!shouldRegisterSW()) {
    // Cleanup leftover SW in preview/iframe — fire and forget
    unregisterAllSW();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    if (registration.waiting) notifyUpdateReady(registration);

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          notifyUpdateReady(registration);
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);

    const logVersion = () => {
      const target = navigator.serviceWorker.controller || registration.active;
      if (!target) return;
      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => {
          console.log("[SW] versão ativa:", e.data);
        };
        target.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      } catch {
        // ignore
      }
    };
    if (registration.active) logVersion();
    navigator.serviceWorker.ready.then(logVersion).catch(() => {});
  } catch (error) {
    console.error("Falha ao registrar Service Worker:", error);
  }
}

// Defer SW work until the browser is idle so it doesn't fight initial render
const scheduleIdle =
  (window as any).requestIdleCallback ||
  ((cb: () => void) => setTimeout(cb, 1));
scheduleIdle(() => {
  setupServiceWorker();
});
