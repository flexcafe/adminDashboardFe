import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSuggestions } from "@/features/suggestions/SuggestionsContext";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useAdminNotifications } from "@/features/adminNotifications/AdminNotificationsContext";
import { translateDynamicField } from "@/lib/i18n/dynamic";
import flexUsedLogo from "@/assets/flex-used-logo.png";
import { PageTransition } from "@/components/motion/PageTransition";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13.5h6.5V20H4z" />
      <path d="M13.5 4H20v9.5h-6.5z" />
      <path d="M4 4h6.5v6.5H4z" />
      <path d="M13.5 16.5H20V20h-6.5z" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M5 19.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-5 3.5Z" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.6 5.26 5.8.84-4.2 4.1.99 5.8L12 16.2 6.81 19l.99-5.8-4.2-4.1 5.8-.84L12 3z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="12" r="2.5" />
      <path d="M10 12h10" />
      <path d="M16 12v3" />
      <path d="M19 12v2" />
    </svg>
  );
}

function FraudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v4" />
      <path d="M10.36 3.76a2 2 0 0 1 3.28 0l7.54 12.6A2 2 0 0 1 19.54 19H4.46a2 2 0 0 1-1.64-3.06l7.54-12.6Z" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function SliderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 15 4.5-4.5a2 2 0 0 1 2.83 0L14 14l1.5-1.5a2 2 0 0 1 2.83 0L21 15" />
      <circle cx="9" cy="10" r="1.5" />
    </svg>
  );
}

function NotificationsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a4 4 0 0 0-4 4v1.4c0 .7-.2 1.39-.58 1.98L6 12.5h12l-1.42-2.12A3.6 3.6 0 0 1 16 8.4V7a4 4 0 0 0-4-4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 17H5.5a1.5 1.5 0 0 1-1.2-2.4l1.2-1.6V9a6.5 6.5 0 1 1 13 0v4l1.2 1.6a1.5 1.5 0 0 1-1.2 2.4H18" />
      <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

function resolveUiLocale(language: string) {
  if (language === "ko") return "ko-KR";
  if (language === "zh-CN") return "zh-CN";
  if (language === "my") return "my-MM";
  return "en-US";
}

type SidebarNavItemProps = {
  to: string;
  title: ReactNode;
  meta: string;
  icon: ReactNode;
};

function SidebarNavItem({ to, title, meta, icon }: SidebarNavItemProps) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="sidebarActivePill"
              className="navItemActivePill"
              transition={{ type: "spring", stiffness: 500, damping: 42, mass: 0.8 }}
            />
          ) : null}
          <span className="navItemIcon">
            {icon}
          </span>
          <span className="navItemBody">
            <span className="navItemTitle">{title}</span>
            <span className="navItemMeta">{meta}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    error: notificationsError,
    isRealtimeConnected,
    refreshNotifications,
    markAllNotificationsRead,
    markNotificationsRead,
  } = useAdminNotifications();
  const { pendingCount: suggestionsPendingCount } = useSuggestions();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserName = user?.name || "Admin";
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const storedValue = window.localStorage.getItem("adminSidebarExpanded");
    return storedValue === null ? true : storedValue === "true";
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("adminSidebarExpanded", String(isSidebarExpanded));
  }, [isSidebarExpanded]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isNotificationsOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => {
      if (!prev) {
        void refreshNotifications();
      }
      return !prev;
    });
  };

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(resolveUiLocale(i18n.language));
  };

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
    }));
  }, [i18n, notifications, t]);

  const handleNotificationClick = (notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) {
      markNotificationsRead([notificationId]);
    }
    navigate("/notifications", {
      state: notificationId ? { highlightNotificationId: notificationId } : undefined,
    });
  };

  return (
    <div className={`appShell ${isSidebarExpanded ? "appShellSidebarExpanded" : "appShellSidebarCollapsed"}`}>
      <aside className="sidebar">
        <div className="sidebarHeader">
          <img className="brandLogo" src={flexUsedLogo} alt="Flex Used Market logo" />
          <div className="brandText">
            <div className="brandTitle">Flex</div>
            <div className="brandSubtitle">{t("shell.brandSubtitle")}</div>
          </div>
        </div>

        <div className="navSectionLabel">{t("shell.mainMenu")}</div>
        <nav className="nav">
          <SidebarNavItem
            to="/fraud-reports"
            icon={<FraudIcon />}
            title={t("shell.fraudReportsTitle")}
            meta={t("shell.fraudReportsMeta")}
          />
          <SidebarNavItem
            to="/dashboard"
            icon={<DashboardIcon />}
            title={t("shell.verificationTitle")}
            meta={t("shell.verificationMeta")}
          />
          <SidebarNavItem
            to="/suggestions"
            icon={<LightbulbIcon />}
            title={(
              <>
                {t("shell.suggestionsTitle")}
                {suggestionsPendingCount > 0 ? (
                  <span className="navItemBadge">{suggestionsPendingCount}</span>
                ) : null}
              </>
            )}
            meta={t("shell.suggestionsMeta")}
          />
          <SidebarNavItem
            to="/admin-chat"
            icon={<ChatIcon />}
            title={t("shell.adminChatTitle")}
            meta={t("shell.adminChatMeta")}
          />
          <SidebarNavItem
            to="/slider-ads"
            icon={<SliderIcon />}
            title={t("shell.sliderAdsTitle")}
            meta={t("shell.sliderAdsMeta")}
          />
          <SidebarNavItem
            to="/categories"
            icon={<CategoriesIcon />}
            title={t("shell.categoriesTitle")}
            meta={t("shell.categoriesMeta")}
          />
          <SidebarNavItem
            to="/notifications"
            icon={<NotificationsNavIcon />}
            title={t("shell.notificationsNavTitle")}
            meta={t("shell.notificationsMeta")}
          />
          <SidebarNavItem
            to="/points"
            icon={<PointsIcon />}
            title={t("shell.rewardsTitle")}
            meta={t("shell.rewardsMeta")}
          />
          <SidebarNavItem
            to="/admin-roles"
            icon={<ShieldIcon />}
            title={t("shell.adminRolesTitle")}
            meta={t("shell.adminRolesMeta")}
          />
          <SidebarNavItem
            to="/facebook-follow"
            icon={<FacebookIcon />}
            title={t("shell.facebookFollowTitle")}
            meta={t("shell.facebookFollowMeta")}
          />
        </nav>

        <div className="navSectionLabel">{t("shell.workspace")}</div>
        <div className="sidebarInfoCard">
          <div className="sidebarInfoTitle">{t("shell.operationsHub")}</div>
          <div className="sidebarInfoText">{t("shell.operationsHubText")}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <div>
              <div className="topbarEyebrow">{t("shell.topbarTitle")}</div>
              <div className="topbarSubtext">{t("shell.topbarSubtitle")}</div>
            </div>
          </div>
          <div className="topbarRight">
            <button
              className={`topbarIconButton sidebarToggleButton ${isSidebarExpanded ? "isActive" : ""}`}
              type="button"
              aria-label={t("shell.mainMenu")}
              aria-pressed={isSidebarExpanded}
              onClick={() => setIsSidebarExpanded((prev) => !prev)}
            >
              <GridIcon />
            </button>
            <LanguageSwitcher />
            <div className="notificationsWrap" ref={notificationsRef}>
              <button
                className="topbarIconButton notificationsTrigger"
                type="button"
                aria-label={t("shell.notificationsNavTitle")}
                aria-expanded={isNotificationsOpen}
                onClick={handleToggleNotifications}
              >
                <BellIcon />
                {unreadCount > 0 ? (
                  <span className="notificationsBadge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotificationsOpen ? (
                <div className="notificationsPanel">
                  <div className="notificationsPanelHeader">
                    <div>
                      <div className="sectionTitle">{t("shell.notificationsTitle")}</div>
                      <p className="sectionDescription">
                        {isRealtimeConnected
                          ? t("shell.notificationsLive")
                          : t("shell.notificationsLatest")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="verificationActionButton subtle"
                      onClick={() => {
                        void refreshNotifications();
                      }}
                      disabled={isNotificationsLoading}
                    >
                      {isNotificationsLoading ? `${t("common.refresh")}...` : t("common.refresh")}
                    </button>
                  </div>

                  {notificationsError ? (
                    <p className="authError notificationsError">
                      {notificationsError}
                    </p>
                  ) : null}

                  <div className="notificationsList">
                    {notifications.length === 0 ? (
                      <div className="notificationsEmptyState">
                        {t("shell.notificationsEmpty")}
                      </div>
                    ) : (
                      localizedNotifications.slice(0, 8).map((item) => (
                        <article
                          key={item.id}
                          className={
                            item.isRead
                              ? "notificationsItem"
                              : "notificationsItem unread"
                          }
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleNotificationClick(item.id);
                            }
                          }}
                        >
                          <div className="notificationsItemTop">
                            <span className="inlineBadge">{item.localizedType}</span>
                            <span className="notificationsTimestamp">
                              {formatNotificationDate(item.createdAt)}
                            </span>
                          </div>
                          <div className="notificationsTitle">{item.localizedTitle}</div>
                        </article>
                      ))
                    )}
                  </div>
                  <div className="notificationsPanelFooter">
                    <button
                      type="button"
                      className="verificationActionButton subtle notificationsViewAllButton"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        markAllNotificationsRead();
                        navigate("/notifications");
                      }}
                    >
                      {t("shell.openNotificationCenter")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <ThemeToggle />
            <div className="topbarIdentity">
              <span className="topbarRole">{t("shell.signedInAs")}</span>
              <span className="topbarUser">{currentUserName}</span>
              <span className="topbarRole">{t("shell.administrator")}</span>
            </div>
            <button className="btn topbarLogout" type="button" onClick={handleLogout}>
              {t("shell.logout")}
            </button>
          </div>
        </header>
        <main className="content">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
