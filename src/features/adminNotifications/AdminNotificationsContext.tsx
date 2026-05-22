import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import Pusher from "pusher-js";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { tokenCookies } from "@/lib/cookies";
import { PUSHER_CHANNELS, PUSHER_CONFIG, PUSHER_EVENTS } from "@/config/pusher";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type PusherAuthorizationResponse = {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
};

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  userId?: string;
  routePath?: string;
};

type AdminNotificationsContextValue = {
  notifications: AdminNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  lastNotificationAt: number;
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: (notificationIds: string[]) => void;
  markAllNotificationsRead: () => void;
  /** Sends a POST request to the backend to mark all notifications as read,
   *  then flushes the local unread state to zero. */
  markAllNotificationsReadAsync: () => Promise<void>;
};

const AdminNotificationsContext =
  createContext<AdminNotificationsContextValue | null>(null);

const READ_NOTIFICATIONS_STORAGE_KEY = "admin-notifications-read-ids";
const NOTIFICATIONS_REFRESH_INTERVAL_MS = 15000;

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "read";
  }
  return false;
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    const candidates = [root.items, root.notifications, root.rows, root.data];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        );
      }
    }
  }

  return [];
};

const normalizeNotification = (item: Record<string, unknown>): AdminNotification | null => {
  const id = toText(item.id) || toText(item.notificationId) || toText(item._id);
  if (!id) return null;

  const userId =
    toText(item.userId) ||
    toText(item.user_id) ||
    toText(item.targetUserId) ||
    toText(item.relatedUserId) ||
    toText(item.referenceId);
  const title =
    toText(item.title) ||
    toText(item.subject) ||
    toText(item.event) ||
    "Admin notification";
  const message =
    toText(item.message) ||
    toText(item.body) ||
    toText(item.description) ||
    toText(item.content) ||
    "A new admin update has arrived.";
  const type =
    toText(item.type) ||
    toText(item.category) ||
    toText(item.event) ||
    "GENERAL";
  const explicitRoutePath =
    toText(item.routePath) ||
    toText(item.path) ||
    toText(item.link) ||
    toText(item.url);
  const routeHint = `${title} ${message} ${type}`.toLowerCase();
  const isFacebookFollowNotification =
    routeHint.includes("facebook") || routeHint.includes("follow");
  const isVerificationNotification =
    !!userId &&
    !isFacebookFollowNotification &&
    (routeHint.includes("verification") ||
      routeHint.includes("verify") ||
      routeHint.includes("kbz") ||
      routeHint.includes("email"));

  return {
    id,
    title,
    message,
    type,
    createdAt:
      toText(item.createdAt) ||
      toText(item.date) ||
      toText(item.timestamp) ||
      new Date().toISOString(),
    isRead:
      toBoolean(item.isRead) ||
      toBoolean(item.read) ||
      toBoolean(item.is_seen),
    userId: userId || undefined,
    routePath:
      explicitRoutePath ||
      (isFacebookFollowNotification
        ? "/facebook-follow"
        : isVerificationNotification
          ? `/dashboard/${userId}`
          : undefined),
  };
};

const mergeNotifications = (
  current: AdminNotification[],
  incoming: AdminNotification
) => [incoming, ...current.filter((item) => item.id !== incoming.id)];

const sortNotificationsByDate = (items: AdminNotification[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const getReadNotificationsStorageKey = (userId?: string | null) =>
  `${READ_NOTIFICATIONS_STORAGE_KEY}:${userId || "anonymous"}`;

const readStoredNotificationIds = (userId?: string | null) => {
  try {
    const raw = window.localStorage.getItem(getReadNotificationsStorageKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    );
  } catch {
    return new Set<string>();
  }
};

const writeStoredNotificationIds = (ids: Set<string>, userId?: string | null) => {
  try {
    window.localStorage.setItem(
      getReadNotificationsStorageKey(userId),
      JSON.stringify(Array.from(ids).slice(-500))
    );
  } catch {
    // Ignore storage failures and keep in-memory state working.
  }
};

export function AdminNotificationsProvider({
  children,
}: PropsWithChildren) {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastNotificationAt, setLastNotificationAt] = useState(0);
  const readNotificationIdsRef = useRef<Set<string>>(new Set());
  const refreshNotificationsRef = useRef<() => Promise<void>>(async () => undefined);
  const currentUserId = user?.id || null;

  useEffect(() => {
    readNotificationIdsRef.current = readStoredNotificationIds(currentUserId);
  }, [currentUserId]);

  const mergeFetchedNotifications = useCallback(
    (incoming: AdminNotification[]) => {
      let foundNewNotification = false;
      const nextNotifications = sortNotificationsByDate(
        incoming.map((item) => ({
          ...item,
          isRead: item.isRead || readNotificationIdsRef.current.has(item.id),
        }))
      );

      setNotifications((current) => {
        const currentById = new Map(current.map((item) => [item.id, item]));
        const next = nextNotifications.map((item) => {
          const existing = currentById.get(item.id);
          const isRead = item.isRead || existing?.isRead || false;

          if (!existing && !isRead) {
            foundNewNotification = true;
          }

          return { ...item, isRead };
        });

        return next;
      });

      if (foundNewNotification) {
        setLastNotificationAt(Date.now());
      }
    },
    []
  );

  const refreshNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use ?status=unread filter on initial/login fetch to prevent legacy
      // read notifications from appearing as new alerts. Real-time Pusher
      // events (below) still capture ALL fresh incoming notifications during
      // the active session regardless of this filter.
      const response = await httpClient.get<ApiResponse<unknown>>(
        `${API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST}?status=unread`
      );

      const normalized = toRecordArray(response?.data)
        .map((item) => normalizeNotification(item))
        .filter((item): item is AdminNotification => !!item)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      mergeFetchedNotifications(normalized);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin notifications."
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient, mergeFetchedNotifications]);

  refreshNotificationsRef.current = refreshNotifications;

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!PUSHER_CONFIG.key || !PUSHER_CONFIG.adminNotificationsEnabled) return;

    const token = tokenCookies.getToken();
    if (!token) return;

    const isPrivateChannel =
      PUSHER_CHANNELS.ADMIN_DASHBOARD.startsWith("private-") ||
      PUSHER_CHANNELS.ADMIN_DASHBOARD.startsWith("presence-");

    const pusher = new Pusher(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
      ...(isPrivateChannel
        ? {
            channelAuthorization: {
              customHandler: async ({ socketId, channelName }, callback) => {
                try {
                  const auth = await httpClient.post<PusherAuthorizationResponse>(
                    API_ENDPOINTS.PUSHER.ADMIN_AUTH,
                    {
                      socket_id: socketId,
                      channel_name: channelName,
                    }
                  );
                  callback(null, auth);
                } catch (authError) {
                  callback(authError as Error, { auth: "" });
                }
              },
            },
          }
        : {}),
    });

    const channel = pusher.subscribe(PUSHER_CHANNELS.ADMIN_DASHBOARD);

    const handleRealtimeNotification = (payload: unknown) => {
      const normalized =
        payload && typeof payload === "object"
          ? normalizeNotification(payload as Record<string, unknown>)
          : null;

      if (normalized) {
        setNotifications((current) => {
          const isLocallyRead = readNotificationIdsRef.current.has(normalized.id);
          return mergeNotifications(current, {
            ...normalized,
            isRead: normalized.isRead || isLocallyRead,
          });
        });
        setLastNotificationAt(Date.now());
      } else {
        void refreshNotificationsRef.current();
        setLastNotificationAt(Date.now());
      }
    };

    channel.bind(PUSHER_EVENTS.ADMIN_NOTIFICATION, handleRealtimeNotification);

    pusher.connection.bind("connected", () => {
      setIsRealtimeConnected(true);
    });

    pusher.connection.bind("disconnected", () => {
      setIsRealtimeConnected(false);
    });

    pusher.connection.bind("error", () => {
      setIsRealtimeConnected(false);
    });

    return () => {
      channel.unbind(PUSHER_EVENTS.ADMIN_NOTIFICATION, handleRealtimeNotification);
      pusher.unsubscribe(PUSHER_CHANNELS.ADMIN_DASHBOARD);
      pusher.disconnect();
      setIsRealtimeConnected(false);
    };
  }, [httpClient]);

  useEffect(() => {
    const refreshIfActive = () => {
      if (document.visibilityState !== "visible") return;
      void refreshNotifications();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (isRealtimeConnected) return;
      void refreshNotifications();
    }, NOTIFICATIONS_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshIfActive);
    document.addEventListener("visibilitychange", refreshIfActive);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfActive);
      document.removeEventListener("visibilitychange", refreshIfActive);
    };
  }, [isRealtimeConnected, refreshNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const markNotificationsRead = useCallback((notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    setNotifications((current) => {
      const next = current.map((item) =>
        notificationIds.includes(item.id) ? { ...item, isRead: true } : item
      );
      notificationIds.forEach((id) => readNotificationIdsRef.current.add(id));
      writeStoredNotificationIds(readNotificationIdsRef.current, currentUserId);
      return next;
    });
  }, [currentUserId]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => {
      const next = current.map((item) => ({ ...item, isRead: true }));
      next.forEach((item) => readNotificationIdsRef.current.add(item.id));
      writeStoredNotificationIds(readNotificationIdsRef.current, currentUserId);
      return next;
    });
  }, [currentUserId]);

  const markAllNotificationsReadAsync = useCallback(async () => {
    try {
      setError(null);
      await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.MARK_ALL_READ
      );
      // Flush local state: mark every notification as read and clear the
      // stored read-ids set since the backend has acknowledged the bulk action.
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      readNotificationIdsRef.current = new Set<string>();
      writeStoredNotificationIds(readNotificationIdsRef.current, currentUserId);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to mark all notifications as read."
      );
    }
  }, [httpClient, currentUserId]);

  const value = useMemo<AdminNotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      isRealtimeConnected,
      lastNotificationAt,
      refreshNotifications,
      markNotificationsRead,
      markAllNotificationsRead,
      markAllNotificationsReadAsync,
    }),
    [
      error,
      isLoading,
      isRealtimeConnected,
      lastNotificationAt,
      markAllNotificationsRead,
      markAllNotificationsReadAsync,
      markNotificationsRead,
      notifications,
      refreshNotifications,
      unreadCount,
    ]
  );

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

// Provider + hook in one module to keep feature state colocated.
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext);

  if (!context) {
    throw new Error(
      "useAdminNotifications must be used within AdminNotificationsProvider."
    );
  }

  return context;
}
