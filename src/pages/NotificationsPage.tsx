import { Bell, BellRing, MailCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  useAdminNotifications,
} from "@/features/adminNotifications/AdminNotificationsContext";
import { translateDynamicField } from "@/lib/i18n/dynamic";

const formatDateTime = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

export function NotificationsPage() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isRealtimeConnected,
    markNotificationsRead,
    markAllNotificationsReadAsync,
    refreshNotifications,
  } = useAdminNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMarkAllConfirmOpen, setIsMarkAllConfirmOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const highlightId = (
    location.state as { highlightNotificationId?: string } | null
  )?.highlightNotificationId;

  const localizedNotifications = useMemo(() => {
    return notifications.map((item) => ({
      ...item,
      localizedType: translateDynamicField(i18n, t, {
        eventKey: item.eventKey,
        rawType: item.type,
        rawTitle: item.title,
        rawMessage: item.message,
        metadata: item.metadata,
        payload: item.payload,
      }, "type"),
      localizedTitle: translateDynamicField(i18n, t, {
        eventKey: item.eventKey,
        rawType: item.type,
        rawTitle: item.title,
        rawMessage: item.message,
        metadata: item.metadata,
        payload: item.payload,
      }, "title"),
      localizedMessage: translateDynamicField(i18n, t, {
        eventKey: item.eventKey,
        rawType: item.type,
        rawTitle: item.title,
        rawMessage: item.message,
        metadata: item.metadata,
        payload: item.payload,
      }, "message"),
    }));
  }, [i18n, notifications, t]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return localizedNotifications;
    return localizedNotifications.filter((item) =>
      `${item.localizedTitle} ${item.localizedMessage} ${item.localizedType}`
        .toLowerCase()
        .includes(query)
    );
  }, [localizedNotifications, searchQuery]);

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

  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingAll(true);
    await markAllNotificationsReadAsync();
    setIsMarkingAll(false);
    setIsMarkAllConfirmOpen(false);
  }, [markAllNotificationsReadAsync]);

  return (
    <section className="page notificationsPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("notificationsPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("notificationsPage.title")}</h1>
          <p className="pageDescription">{t("notificationsPage.description")}</p>
        </div>
        <div className="pageHeaderActions">
          {unreadCount > 0 ? (
            <button
              type="button"
              className="verificationActionButton subtle"
              onClick={() => setIsMarkAllConfirmOpen(true)}
              disabled={isLoading || isMarkingAll}
            >
              <span>{t("notificationsPage.markAllAsRead")}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              void refreshNotifications();
            }}
            disabled={isLoading}
          >
            <span>{isLoading ? t("notificationsPage.refreshing") : t("common.refresh")}</span>
          </button>
        </div>
      </div>

      <div className="notificationsSummaryGrid">
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardBlue">
          <div className="rewardsSummaryIcon rewardsSummaryIconBlue">
            <Bell size={18} />
          </div>
          <div className="metricLabel">
            {t("notificationsPage.totalNotifications")}
          </div>
          <div className="metricValue">{notifications.length}</div>
          <div className="metricMeta">{t("notificationsPage.totalMeta")}</div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardAmber">
          <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
            <BellRing size={18} />
          </div>
          <div className="metricLabel">{t("notificationsPage.needsReview")}</div>
          <div className="metricValue">{unreadCount}</div>
          <div className="metricMeta">
            {t("notificationsPage.needsReviewMeta")}
          </div>
        </div>
        <div className="metricCard notificationsSummaryCard notificationsSummaryCardGreen">
          <div className="rewardsSummaryIcon rewardsSummaryIconEmerald">
            <MailCheck size={18} />
          </div>
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
            filteredNotifications.map((item) => (
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
                <div className="notificationsPageItemRow">
                  <div className="notificationsPageItemBody">
                    <div className="notificationsPageItemTop">
                      <span className="inlineBadge">{item.localizedType}</span>
                    </div>
                    <div className="notificationsTitle">{item.localizedTitle}</div>
                    <p className="notificationsMessage">{item.localizedMessage}</p>
                  </div>
                  <div className="notificationsPageItemSide">
                    <span className="notificationsTimestamp">
                      {formatDateTime(item.createdAt, i18n.language)}
                    </span>
                    {!item.isRead ? (
                      <button
                        type="button"
                        className="verificationActionButton subtle notificationsMarkReadBtn"
                        onClick={() => markNotificationsRead([item.id])}
                      >
                        {t("notificationsPage.markAsRead")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {isMarkAllConfirmOpen ? (
        <div className="sliderModalOverlay" role="presentation" onClick={() => setIsMarkAllConfirmOpen(false)}>
          <div
            className="sliderConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-all-read-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="mark-all-read-title" className="sectionTitle">
              {t("notificationsPage.markAllReadTitle")}
            </h2>
            <p className="sectionDescription">
              {t("notificationsPage.markAllReadDescription")}
            </p>
            <div className="sliderModalActions">
              <button
                type="button"
                className="verificationActionButton subtle"
                onClick={() => setIsMarkAllConfirmOpen(false)}
                disabled={isMarkingAll}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="verificationActionButton"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={isMarkingAll}
              >
                {isMarkingAll
                  ? t("notificationsPage.markingAll")
                  : t("notificationsPage.confirmMarkAll")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
