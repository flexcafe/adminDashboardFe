import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";

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

function PointsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.6 5.26 5.8.84-4.2 4.1.99 5.8L12 16.2 6.81 19l.99-5.8-4.2-4.1 5.8-.84L12 3z" />
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
  const navigate = useNavigate();
  const currentUserName = user?.name || "Admin";
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedMode = window.localStorage.getItem("theme-mode");
    if (savedMode === "dark" || savedMode === "light") {
      setThemeMode(savedMode);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeMode(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brandMark" aria-hidden="true" />
          <div className="brandText">
            <div className="brandTitle">Flex reseller</div>
            <div className="brandSubtitle">Admin dashboard</div>
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
          <NavLink to="/points" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            <span className="navItemIcon">
              <PointsIcon />
            </span>
            <span className="navItemBody">
              <span className="navItemTitle">Rewards</span>
              <span className="navItemMeta">Points, ranks, and withdrawal control</span>
            </span>
          </NavLink>
        </nav>

        <div className="navSectionLabel">Workspace</div>
        <div className="sidebarInfoCard">
          <div className="sidebarInfoTitle">Operations hub</div>
          <div className="sidebarInfoText">Track verifications, payouts, and reseller rewards from one workspace.</div>
        </div>

        <div className="sidebarFoot">
          <div className="sidebarFootAvatar">{currentUserName.slice(0, 1)}</div>
          <div>
            <div className="sidebarFootLabel">Signed in as</div>
            <div className="sidebarFootUser">{currentUserName}</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <div className="topbarEyebrow">Flex reseller</div>
          </div>
          <div className="topbarRight">
            <button className="topbarIconButton" type="button" aria-label="Open apps">
              <GridIcon />
            </button>
            <button className="topbarIconButton" type="button" aria-label="Notifications">
              <BellIcon />
            </button>
            <button className="topbarIconButton" type="button" aria-label="Toggle theme" onClick={handleToggleTheme} title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {themeMode === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="topbarIdentity">
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
    </div>
  );
}
