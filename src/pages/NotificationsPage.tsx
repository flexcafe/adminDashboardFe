import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useAdminNotifications,
  type AdminNotification,
} from "@/features/adminNotifications/AdminNotificationsContext";

const formatDateTime = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const getNotificationRoute = (item: AdminNotification): string | null => {
  if (item.routePath) return item.routePath;
  if (item.userId) return `/dashboard/${item.userId}`;
  return null;
};

export function NotificationsPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isRealtimeConnected,
    markNotificationsRead,
    refreshNotifications,
  } = useAdminNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const highlightId = (
    location.state as { highlightNotificationId?: string } | null
  )?.highlightNotificationId;

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notifications;
    return notifications.filter((item) =>
      `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  useEffect(() => {
    if (!highlightId) return;
    markNotificationsRead([highlightId]);
  }, [highlightId, markNotificationsRead]);

  useEffect(() => {
    if (!highlightId) return;
    const el = itemRefs.current.get(highlightId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlighted");
    const timer = setTimeout(() => el.classList.remove("highlighted"), 3000);
    return () => clearTimeout(timer);
  }, [highlightId, filteredNotifications]);

  return (
    <section className="page notificationsPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("notificationsPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("notificationsPage.title")}</h1>
          <p className="pageDescription">{t("notificationsPage.description")}</p>
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
            {isLoading ? t("notificationsPage.refreshing") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="notificationsSummaryGrid">
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardBlue">
          <div className="metricLabel">
            {t("notificationsPage.totalNotifications")}
          </div>
          <div className="metricValue">{notifications.length}</div>
          <div className="metricMeta">{t("notificationsPage.totalMeta")}</div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardAmber">
          <div className="metricLabel">{t("notificationsPage.needsReview")}</div>
          <div className="metricValue">{unreadCount}</div>
          <div className="metricMeta">
            {t("notificationsPage.needsReviewMeta")}
          </div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardGreen">
          <div className="metricLabel">{t("notificationsPage.connection")}</div>
          <div className="metricValue">
            {isRealtimeConnected
              ? t("notificationsPage.connectionLive")
              : t("notificationsPage.connectionSync")}
          </div>
          <div className="metricMeta">
            {isRealtimeConnected
              ? t("notificationsPage.connectionLiveMeta")
              : t("notificationsPage.connectionSyncMeta")}
          </div>
        </div>
      </div>

      <div className="card notificationsPagePanel">
        <div className="notificationsPageToolbar">
          <div>
            <div className="sectionTitle">
              {t("notificationsPage.recordsTitle")}
            </div>
            <p className="sectionDescription">
              {t("notificationsPage.recordsDescription")}
            </p>
          </div>
          <div className="notificationsPageSearchField">
            <input
              type="search"
              className="authInput"
              placeholder={t("notificationsPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="authError surfaceMessage">{error}</p> : null}

        <div className="notificationsPageList">
          {filteredNotifications.length === 0 ? (
            <div className="notificationsPageEmpty">
              {searchQuery.trim()
                ? t("notificationsPage.emptySearch")
                : t("notificationsPage.emptyDefault")}
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const detailsRoute = getNotificationRoute(item);
              return (
                <article
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  className={
                    item.isRead
                      ? "notificationsPageItem"
                      : "notificationsPageItem unread"
                  }
                >
                  <div className="notificationsPageItemTop">
                    <span className="inlineBadge">{item.type}</span>
                    <span className="notificationsTimestamp">
                      {formatDateTime(item.createdAt, i18n.language)}
                    </span>
                  </div>
                  <div className="notificationsTitle">{item.title}</div>
                  <p className="notificationsMessage">{item.message}</p>
                  <div className="notificationsPageItemActions">
                    {detailsRoute ? (
                      <button
                        type="button"
                        className="verificationActionButton"
                        onClick={() => {
                          markNotificationsRead([item.id]);
                          navigate(detailsRoute);
                        }}
                      >
                        {t("notificationsPage.viewDetails")}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
