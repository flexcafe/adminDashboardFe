import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import Pusher from "pusher-js";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
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
  markPanelOpened: () => void;
};

const AdminNotificationsContext =
  createContext<AdminNotificationsContextValue | null>(null);

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
    const candidates = [root.items, root.notifications, root.rows];

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
  const routeHint = `${title} ${message} ${type}`.toLowerCase();
  const isVerificationNotification =
    !!userId &&
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
    routePath: isVerificationNotification ? `/dashboard/${userId}` : undefined,
  };
};

const mergeNotifications = (
  current: AdminNotification[],
  incoming: AdminNotification
) => [incoming, ...current.filter((item) => item.id !== incoming.id)];

export function AdminNotificationsProvider({
  children,
}: PropsWithChildren) {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastNotificationAt, setLastNotificationAt] = useState(0);

  const refreshNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await httpClient.get<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST
      );

      const normalized = toRecordArray(response?.data)
        .map((item) => normalizeNotification(item))
        .filter((item): item is AdminNotification => !!item)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      setNotifications(normalized);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin notifications."
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!PUSHER_CONFIG.key) return;

    const token = tokenCookies.getToken();
    if (!token) return;

    const pusher = new Pusher(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
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
    });

    const channel = pusher.subscribe(PUSHER_CHANNELS.ADMIN_DASHBOARD);

    const handleRealtimeNotification = (payload: unknown) => {
      const normalized =
        payload && typeof payload === "object"
          ? normalizeNotification(payload as Record<string, unknown>)
          : null;

      if (normalized) {
        setNotifications((current) => mergeNotifications(current, normalized));
        setLastNotificationAt(Date.now());
      } else {
        void refreshNotifications();
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
  }, [httpClient, refreshNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const markPanelOpened = useCallback(() => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true }))
    );
  }, []);

  const value = useMemo<AdminNotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      isRealtimeConnected,
      lastNotificationAt,
      refreshNotifications,
      markPanelOpened,
    }),
    [
      error,
      isLoading,
      isRealtimeConnected,
      lastNotificationAt,
      markPanelOpened,
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

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext);

  if (!context) {
    throw new Error(
      "useAdminNotifications must be used within AdminNotificationsProvider."
    );
  }

  return context;
}
