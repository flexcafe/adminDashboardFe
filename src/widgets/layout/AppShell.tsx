import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useAdminNotifications } from "@/features/adminNotifications/AdminNotificationsContext";
import flexUsedLogo from "@/assets/flex-used-logo.svg";

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

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2.5 12H5M19 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.4 14.5A8.7 8.7 0 1 1 9.5 3.6 7 7 0 1 0 20.4 14.5z" />
    </svg>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const {
    notifications,
    toastNotifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    error: notificationsError,
    isRealtimeConnected,
    refreshNotifications,
    markAllNotificationsRead,
    markNotificationsRead,
    dismissToast,
  } = useAdminNotifications();
  const navigate = useNavigate();
  const currentUserName = user?.name || "Admin";
  const currentUserInitial = currentUserName.trim().charAt(0).toUpperCase() || "A";
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const savedMode = window.localStorage.getItem("theme-mode");
    if (savedMode === "dark" || savedMode === "light") {
      return savedMode;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

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

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
  };

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const handleNotificationClick = (notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) {
      markNotificationsRead([notificationId]);
    }
    navigate("/notifications", {
      state: notificationId ? { highlightNotificationId: notificationId } : undefined,
    });
  };

  const handleToastClick = (routePath?: string, toastId?: string) => {
    if (toastId) {
      dismissToast(toastId);
    }
    if (routePath) {
      navigate(routePath);
    }
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <img className="brandLogo" src={flexUsedLogo} alt="Flex Used Market logo" />
          <div className="brandText">
            <div className="brandTitle">Flex</div>
            <div className="brandSubtitle">Used Market Admin</div>
          </div>
        </div>

        <div className="navSectionLabel">Main menu</div>
        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <DashboardIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Verification</span>
              <span className="navItemMeta">Manage pending ownership checks</span>
            </span>
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <CategoriesIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Categories</span>
              <span className="navItemMeta">Build and manage category hierarchy</span>
            </span>
          </NavLink>
          <NavLink to="/points" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <PointsIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Rewards</span>
              <span className="navItemMeta">Points, ranks, and withdrawal control</span>
            </span>
          </NavLink>
          <NavLink to="/facebook-follow" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <FacebookIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Facebook Follow</span>
              <span className="navItemMeta">Review manual follow proof submissions</span>
            </span>
          </NavLink>
          <NavLink to="/slider-ads" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <SliderIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Slider Ads</span>
              <span className="navItemMeta">Create, reorder, and preview homepage banners</span>
            </span>
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <NotificationsNavIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Notifications</span>
              <span className="navItemMeta">View all admin notification records</span>
            </span>
          </NavLink>
        </nav>

        <div className="navSectionLabel">Workspace</div>
        <div className="sidebarInfoCard">
          <div className="sidebarInfoTitle">Operations hub</div>
          <div className="sidebarInfoText">Track verifications, payouts, and reseller rewards.</div>
        </div>
        <div className="sidebarFoot">
          <div className="sidebarFootAvatar" aria-hidden="true">{currentUserInitial}</div>
          <div>
            <div className="sidebarFootLabel">Signed in</div>
            <div className="sidebarFootUser">{currentUserName}</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <div>
              <div className="topbarEyebrow">Flex Used Admin</div>
              <div className="topbarSubtext">Operations workspace for catalog, rewards, and marketplace administration.</div>
            </div>
          </div>
          <div className="topbarRight">
            <button className="topbarIconButton" type="button" aria-label="Quick actions">
              <GridIcon />
            </button>
            <div className="notificationsWrap" ref={notificationsRef}>
              <button
                className="topbarIconButton notificationsTrigger"
                type="button"
                aria-label="Notifications"
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
                        <div className="sectionTitle">Admin Notifications</div>
                        <p className="sectionDescription">
                          {isRealtimeConnected
                            ? "Realtime connection active"
                            : "Showing the latest fetched notifications"}
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
                      {isNotificationsLoading ? "Refreshing..." : "Refresh"}
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
                        No admin notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((item) => (
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
                            <span className="inlineBadge">{item.type}</span>
                            <span className="notificationsTimestamp">
                              {formatNotificationDate(item.createdAt)}
                            </span>
                          </div>
                          <div className="notificationsTitle">{item.title}</div>
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
                      Open Notification Center
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button className="topbarIconButton" type="button" aria-label="Toggle theme" onClick={handleToggleTheme} title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {themeMode === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="topbarIdentity">
              <span className="topbarRole">Signed in as</span>
              <span className="topbarUser">{currentUserName}</span>
              <span className="topbarRole">Administrator</span>
            </div>
            <button className="btn topbarLogout" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {toastNotifications.length > 0 ? (
        <div className="notificationsToastStack" aria-live="polite" aria-atomic="false">
          {toastNotifications.map((toast) => (
            <article
              key={toast.id}
              className={toast.notification.routePath ? "notificationsToast clickable" : "notificationsToast"}
              role={toast.notification.routePath ? "button" : "status"}
              tabIndex={toast.notification.routePath ? 0 : -1}
              onClick={() =>
                handleToastClick(toast.notification.routePath, toast.id)
              }
              onKeyDown={(event) => {
                if (!toast.notification.routePath) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleToastClick(toast.notification.routePath, toast.id);
                }
              }}
            >
              <div className="notificationsToastTop">
                <span className="inlineBadge">{toast.notification.type}</span>
                <button
                  type="button"
                  className="notificationsToastClose"
                  aria-label="Dismiss notification"
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissToast(toast.id);
                  }}
                >
                  x
                </button>
              </div>
              <div className="notificationsToastTitle">
                {toast.notification.title}
              </div>
              <p className="notificationsToastMessage">
                {toast.notification.message}
              </p>
              <div className="notificationsToastMeta">
                <span>{formatNotificationDate(toast.notification.createdAt)}</span>
                {toast.notification.routePath ? (
                  <span className="notificationsToastHint">Open details</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

