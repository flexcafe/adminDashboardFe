import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brandMark" aria-hidden="true" />
          <div className="brandText">
            <div className="brandTitle">Admin</div>
            <div className="brandSubtitle">Dashboard</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarTitle">Admin Dashboard</div>
          <div className="topbarRight">
            <span className="topbarUser">{user?.name || "Admin"}</span>
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

