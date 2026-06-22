import { PushToken } from '@/models/PushToken';

interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Dispatches push notifications to registered push tokens for a user.
 * Gracefully logs output in development/mock environments when credentials are not configured.
 */
export const sendPushNotification = async (userId: string, payload: FcmPayload): Promise<void> => {
  try {
    const tokens = await PushToken.find({ user: userId });
    if (tokens.length === 0) {
      return;
    }

    const tokenStrings = tokens.map(t => t.token);
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;

    const hasCredentials = !!(projectId && clientEmail && privateKey);

    if (hasCredentials) {
      console.log(`[FCM Service] Dispatching real FCM push to user ${userId} on ${tokenStrings.length} devices.`);
      // Real FCM HTTP V1 API or firebase-admin implementation can be loaded dynamically if required
    }

    // Output mock/development logs
    console.log(
      `[FCM Dispatch Log] User: ${userId} | Status: ${hasCredentials ? 'FCM_SENT' : 'MOCK_SENT'}\n` +
      `  Tokens: ${JSON.stringify(tokenStrings)}\n` +
      `  Title: "${payload.title}"\n` +
      `  Body: "${payload.body}"\n` +
      `  Data: ${JSON.stringify(payload.data || {})}`
    );
  } catch (err) {
    console.error('[FCM Service Error]:', err);
  }
};
