const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export const PUSHER_CONFIG = {
  key: readEnv("VITE_PUSHER_KEY", "EXPO_PUBLIC_PUSHER_KEY"),
  cluster: readEnv("VITE_PUSHER_CLUSTER", "EXPO_PUBLIC_PUSHER_CLUSTER").replace(/[^\w-]/g, "") || "us2",
} as const;

export const PUSHER_CHANNELS = {
  DEBT_ALERTS: "debt-alerts",
  ADMIN_DASHBOARD:
    readEnv("VITE_PUSHER_ADMIN_CHANNEL", "EXPO_PUBLIC_PUSHER_ADMIN_CHANNEL") || "private-admin-dashboard",
} as const;

export const PUSHER_EVENTS = {
  DEBT_ALERT: "debt-alert",
  ADMIN_NOTIFICATION:
    readEnv("VITE_PUSHER_ADMIN_EVENT", "EXPO_PUBLIC_PUSHER_ADMIN_EVENT") || "admin-notification",
} as const;
