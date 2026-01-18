import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/errors";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("Prabodh");
  const [email, setEmail] = useState("b@b.com");
  const [password, setPassword] = useState("Password@123");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await register({ name, email, password });
      nav("/orgs");
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-hero">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-title">Create your workspace</div>
          <div className="auth-sub">Built for developers shipping specs</div>
        </div>

        {err && <div className="alert error">{err}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Dev"
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              type="password"
              autoComplete="new-password"
            />
          </label>

          <button className="primary" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
