import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminNotifications } from "@/features/adminNotifications/AdminNotificationsContext";

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isRealtimeConnected,
    refreshNotifications,
  } = useAdminNotifications();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notifications;
    return notifications.filter((item) =>
      `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  return (
    <section className="page notificationsPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">Notifications</p>
          <h1 className="pageTitle">Admin Notifications</h1>
          <p className="pageDescription">
            Review every notification record and jump directly into the related verification work.
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              void refreshNotifications();
            }}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="notificationsSummaryGrid">
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardBlue">
          <div className="metricLabel">Total Notifications</div>
          <div className="metricValue">{notifications.length}</div>
          <div className="metricMeta">All fetched admin notification records</div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardAmber">
          <div className="metricLabel">Unread</div>
          <div className="metricValue">{unreadCount}</div>
          <div className="metricMeta">Notifications not yet opened from the top bar</div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardGreen">
          <div className="metricLabel">Connection</div>
          <div className="metricValue">{isRealtimeConnected ? "Live" : "Sync"}</div>
          <div className="metricMeta">
            {isRealtimeConnected ? "Realtime notification stream connected" : "Showing fetched notifications"}
          </div>
        </div>
      </div>

      <div className="card notificationsPagePanel">
        <div className="notificationsPageToolbar">
          <div>
            <div className="sectionTitle">Notification Records</div>
            <p className="sectionDescription">
              Search titles, message content, or types to find the exact admin notification you need.
            </p>
          </div>
          <div className="notificationsPageSearchField">
            <input
              type="search"
              className="authInput"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="authError surfaceMessage">{error}</p> : null}

        <div className="notificationsPageList">
          {filteredNotifications.length === 0 ? (
            <div className="notificationsPageEmpty">
              {searchQuery.trim() ? "No notifications match your search." : "No admin notifications yet."}
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <article
                key={item.id}
                className={item.isRead ? "notificationsPageItem" : "notificationsPageItem unread"}
              >
                <div className="notificationsPageItemTop">
                  <span className="inlineBadge">{item.type}</span>
                  <span className="notificationsTimestamp">{formatDateTime(item.createdAt)}</span>
                </div>
                <div className="notificationsTitle">{item.title}</div>
                <p className="notificationsMessage">{item.message}</p>
                <div className="notificationsPageItemActions">
                  {item.routePath ? (
                    <button
                      type="button"
                      className="verificationActionButton"
                      onClick={() => navigate(item.routePath!)}
                    >
                      Open Details
                    </button>
                  ) : (
                    <span className="muted">No linked page</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
