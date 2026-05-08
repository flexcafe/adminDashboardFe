export const PUSHER_CONFIG = {
  key: import.meta.env.VITE_PUSHER_KEY || "",
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || "us2",
} as const;

export const PUSHER_CHANNELS = {
  DEBT_ALERTS: "debt-alerts",
  ADMIN_DASHBOARD:
    import.meta.env.VITE_PUSHER_ADMIN_CHANNEL || "private-admin-dashboard",
} as const;

export const PUSHER_EVENTS = {
  DEBT_ALERT: "debt-alert",
  ADMIN_NOTIFICATION:
    import.meta.env.VITE_PUSHER_ADMIN_EVENT || "admin-notification",
} as const;
