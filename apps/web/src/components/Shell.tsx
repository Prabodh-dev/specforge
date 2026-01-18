import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);
  return (
    <Link className={active ? "nav-link active" : "nav-link"} to={to}>
      {label}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { orgId, orgName } = useOrg();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="dot" />
          <div>
            <div className="brand-name">Specforge</div>
            <div className="brand-sub">Dev knowledge workspace</div>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/projects" label="Projects" />
          <NavLink to="/reviews" label="Reviews" />
          <NavLink to="/exports" label="Exports" />
          <NavLink to="/orgs" label="Orgs" />
        </nav>
        <div className="user-pill">
          <div className="user-meta">
            <div className="user-email">{user?.email ?? ""}</div>
            <div className="user-org">
              {orgId ? `Org: ${orgName ?? orgId}` : "No org"}
            </div>
          </div>
          <button className="ghost" onClick={() => logout()}>
            Logout
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
