import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatApiError } from "../lib/errors";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
};

export default function Orgs() {
  const { token, user, logout } = useAuth();
  const { orgId, setOrgId, setOrg } = useOrg();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await apiFetch<{ ok: true; orgs: OrgRow[] }>("/orgs", {
      token,
    });
    setOrgs(res.orgs);
    if (!orgId && res.orgs.length)
      setOrg({ id: res.orgs[0].id, name: res.orgs[0].name });
  }

  useEffect(() => {
    load().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrg() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{
        ok: true;
        org: { id: string; name: string; slug: string };
      }>("/orgs", {
        token,
        method: "POST",
        body: { name, slug },
      });
      setName("");
      setSlug("");
      await load();
      setOrg({ id: res.org.id, name: res.org.name });
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Organizations</h2>
          <div className="muted">Logged in as {user?.email || ""}</div>
          <div className="badge" style={{ marginTop: 6 }}>
            {orgId
              ? `Selected org: ${orgs.find((x) => x.id === orgId)?.name ?? orgId}`
              : "No org selected"}
          </div>
        </div>
        <button className="ghost" onClick={() => logout()}>
          Logout
        </button>
      </div>

      {err && <div className="alert error">{err}</div>}

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Create Org</h3>
        <div className="grid-2">
          <input
            placeholder="Org name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="slug (e.g. specforge-inc)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <div className="form-hint" style={{ gridColumn: "2 / span 1" }}>
            Slug rules: lowercase letters, numbers, and hyphens only
          </div>
        </div>
        <button
          className="primary"
          disabled={loading}
          onClick={createOrg}
          style={{ marginTop: 12 }}
        >
          {loading ? "Creating..." : "Create org"}
        </button>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>My Orgs</h3>
        <div className="card-list">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => setOrg({ id: o.id, name: o.name })}
              className="card"
              style={{
                textAlign: "left",
                border:
                  orgId === o.id
                    ? "1px solid rgba(124,124,255,0.6)"
                    : undefined,
              }}
            >
              <div style={{ fontWeight: 700 }}>{o.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {o.slug} • role: {o.role} •{" "}
                {new Date(o.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          {orgs.length === 0 && (
            <div className="muted">No organizations yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
