import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";

export default function Welcome() {
  const { token } = useAuth();
  const { orgId } = useOrg();
  const nav = useNavigate();

  useEffect(() => {
    if (token && orgId) {
      nav("/projects");
    }
  }, [token, orgId, nav]);

  if (!token) {
    return (
      <div className="auth-hero">
        <div className="auth-card" style={{ maxWidth: 600 }}>
          <div className="auth-head">
            <div className="dot" style={{ marginBottom: 12 }} />
            <div className="auth-title">Welcome to Specforge</div>
            <div className="auth-sub">
              Ship product specifications faster with AI assistance
            </div>
          </div>

          <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                📋 Start with your idea
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                Describe your project in natural language
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                ✨ AI generates documents
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                PRDs, API specs, schemas, and task plans
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                ✅ Review & approve
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                Edit, refine, and finalize your specs
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                📦 Export & share
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                Download formatted docs or share with your team
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
            <Link
              to="/login"
              className="primary"
              style={{
                flex: 1,
                padding: 12,
                textAlign: "center",
                borderRadius: 10,
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="ghost"
              style={{
                flex: 1,
                padding: 12,
                textAlign: "center",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div
        className="auth-hero"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div
          className="auth-card"
          style={{ maxWidth: 500, textAlign: "center" }}
        >
          <h2 style={{ margin: "0 0 12px" }}>Welcome!</h2>
          <p style={{ margin: "0 0 24px", opacity: 0.7 }}>
            Let's set up your workspace.
          </p>
          <button
            style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 12 }}
            onClick={() => nav("/orgs")}
          >
            Create or select an organization
          </button>
        </div>
      </div>
    );
  }

  return null;
}
