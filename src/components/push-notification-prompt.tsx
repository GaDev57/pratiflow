"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function PushNotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
    // Check if user already dismissed
    if (localStorage.getItem("push-dismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  async function enableNotifications() {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // In production, use VAPID public key:
          // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Send subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      }
    } catch (error) {
      console.error("[PUSH] Failed to enable notifications:", error);
    }
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("push-dismissed", "true");
  }

  if (!supported || permission === "granted" || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-card p-4 shadow-lg">
      <p className="text-sm font-medium">Activer les notifications ?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Recevez des rappels pour vos rendez-vous et messages.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={enableNotifications}>
          Activer
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Plus tard
        </Button>
      </div>
    </div>
  );
}
