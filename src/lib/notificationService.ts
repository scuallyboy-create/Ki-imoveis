import { AppNotification, NotificationPreferences, NotificationType } from '../types';

const NOTIFICATIONS_KEY = 'ki_imoveis_notifications_v1';
const DATA_UPDATED_EVENT_NAME = 'ki-data-updated';

function emitUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT_NAME));
  }
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailOnVisitUpdates: true,
  emailOnPropertyStatusChanges: true,
  emailOnRequestUpdates: true,
};

export function getAllNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllNotifications(items: AppNotification[]) {
  if (typeof window === 'undefined') return;
  // Keep latest 200 notifications across platform to avoid localStorage bloat
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 200)));
  emitUpdate();
}

export function getNotificationsForUser(userId: string, userEmail?: string): AppNotification[] {
  const emailLower = (userEmail || '').trim().toLowerCase();
  return getAllNotifications()
    .filter((n) => {
      if (userId && n.userId === userId) return true;
      if (emailLower && n.userEmail?.toLowerCase() === emailLower) return true;
      return false;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getUnreadNotificationCount(userId: string, userEmail?: string): number {
  return getNotificationsForUser(userId, userEmail).filter((n) => !n.read).length;
}

export function markNotificationRead(notificationId: string) {
  const items = getAllNotifications();
  const next = items.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  saveAllNotifications(next);
}

export function markAllNotificationsRead(userId: string, userEmail?: string) {
  const emailLower = (userEmail || '').trim().toLowerCase();
  const items = getAllNotifications();
  const next = items.map((n) => {
    const belongs =
      (userId && n.userId === userId) ||
      (emailLower && n.userEmail?.toLowerCase() === emailLower);
    return belongs ? { ...n, read: true } : n;
  });
  saveAllNotifications(next);
}

export function clearNotificationsForUser(userId: string, userEmail?: string) {
  const emailLower = (userEmail || '').trim().toLowerCase();
  const items = getAllNotifications();
  const next = items.filter((n) => {
    const belongs =
      (userId && n.userId === userId) ||
      (emailLower && n.userEmail?.toLowerCase() === emailLower);
    return !belongs;
  });
  saveAllNotifications(next);
}

export function shouldSendEmailForType(
  prefs: NotificationPreferences | undefined,
  type: NotificationType
): boolean {
  const effective = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(prefs || {}) };
  if (type === 'visit_created' || type === 'visit_confirmed' || type === 'visit_cancelled') {
    return effective.emailOnVisitUpdates;
  }
  if (type === 'property_status_changed') {
    return effective.emailOnPropertyStatusChanges;
  }
  return effective.emailOnRequestUpdates;
}

export function getUserNotificationPreferencesByEmail(
  userId?: string,
  userEmail?: string
): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
    const emailLower = (userEmail || '').trim().toLowerCase();
    const match = profiles.find(
      (p) =>
        (userId && (p.id === userId || p.uid === userId)) ||
        (emailLower && p.email?.toLowerCase() === emailLower)
    );
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(match?.notificationPreferences || {}),
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export interface DispatchNotificationInput {
  userId: string;
  userEmail: string;
  recipientName?: string;
  type: NotificationType;
  title: string;
  message: string;
  emailSubject: string;
  relatedId?: string;
  link?: string;
  sendEmail?: boolean;
}

export async function dispatchNotification(
  input: DispatchNotificationInput
): Promise<AppNotification> {
  const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const prefs = getUserNotificationPreferencesByEmail(input.userId, input.userEmail);
  const allowEmail = input.sendEmail !== false && shouldSendEmailForType(prefs, input.type);

  const initialRecord: AppNotification = {
    id,
    userId: input.userId,
    userEmail: input.userEmail,
    type: input.type,
    title: input.title,
    message: input.message,
    emailSubject: input.emailSubject,
    emailSent: false,
    deliveryProvider: 'platform_inbox',
    deliveryNote: allowEmail
      ? 'A processar envio de alerta por e-mail...'
      : 'Alerta registado na caixa da plataforma (e-mail desativado nas preferências).',
    read: false,
    relatedId: input.relatedId,
    link: input.link,
    createdAt: Date.now(),
  };

  const current = getAllNotifications();
  saveAllNotifications([initialRecord, ...current]);

  if (!allowEmail || !input.userEmail || !input.userEmail.includes('@')) {
    return initialRecord;
  }

  try {
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: input.userEmail,
        recipientName: input.recipientName,
        subject: input.emailSubject,
        title: input.title,
        message: input.message,
        eventType: input.type,
      }),
    });

    const data = await res.json();
    const updatedRecord: AppNotification = {
      ...initialRecord,
      emailSent: Boolean(data?.delivered),
      deliveryProvider:
        data?.provider === 'smtp' || data?.provider === 'resend'
          ? data.provider
          : 'platform_inbox',
      deliveryNote:
        data?.note ||
        (data?.delivered
          ? `E-mail enviado para ${input.userEmail}`
          : data?.error || `Alerta registado para ${input.userEmail}`),
    };

    const refreshed = getAllNotifications().map((item) =>
      item.id === id ? updatedRecord : item
    );
    saveAllNotifications(refreshed);
    return updatedRecord;
  } catch {
    const fallbackRecord: AppNotification = {
      ...initialRecord,
      emailSent: false,
      deliveryProvider: 'platform_inbox',
      deliveryNote: 'Alerta guardado na caixa de notificações da plataforma.',
    };
    const refreshed = getAllNotifications().map((item) =>
      item.id === id ? fallbackRecord : item
    );
    saveAllNotifications(refreshed);
    return fallbackRecord;
  }
}
