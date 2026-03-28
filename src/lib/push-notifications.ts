/**
 * Web Push notification helpers.
 * Server-side: send push notifications to subscribed users.
 *
 * Note: Full Web Push requires VAPID keys (web-push npm package).
 * This implementation provides the client-side subscription logic
 * and a server-side sending stub.
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Register a push subscription for a user.
 * Called from the client after service worker registration.
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<boolean> {
  // In production, save to a push_subscriptions table
  // For now, log and return success
  console.log(
    `[PUSH] Subscription registered for user ${userId}:`,
    subscription.endpoint.substring(0, 50)
  );
  return true;
}

/**
 * Send a push notification to a user.
 * Requires web-push package and VAPID keys in production.
 */
export async function sendPushNotification(
  _userId: string,
  title: string,
  body: string,
  _url?: string
): Promise<boolean> {
  // Stub: In production, fetch user's push subscriptions
  // and send via web-push
  console.log(`[PUSH] Would send notification: "${title}" — ${body}`);
  return false;
}
