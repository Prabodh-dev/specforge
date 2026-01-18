import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrg } from "../context/OrgContext";
import { formatApiError } from "../lib/errors";

type ProjectRow = { id: string; name: string; description?: string | null };
type ExportRow = {
  id: string;
  projectId: string;
  type: string;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  publicUrl?: string | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

const EXPORTS = [
  { type: "PRD_MD", label: "PRD (Markdown)" },
  { type: "OPENAPI_JSON", label: "OpenAPI (JSON)" },
  { type: "DB_SCHEMA_JSON", label: "DB Schema (JSON)" },
  { type: "SCAFFOLD_ZIP", label: "Scaffold (ZIP)" },
];

function apiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:4000";
}

export default function Exports() {
  const { orgId } = useOrg();
  const nav = useNavigate();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<ExportRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const shouldPoll = useMemo(() => {
    return items.some(
      (x) => x.status === "QUEUED" || x.status === "PROCESSING",
    );
  }, [items]);

  async function loadProjects() {
    if (!orgId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/projects?orgId=${orgId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const mapped = (data.projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
      }));
      setProjects(mapped);
      if (!projectId && mapped[0]?.id) setProjectId(mapped[0].id);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load projects");
    }
  }

  async function loadExports(pid?: string) {
    if (!orgId) return;
    const id = pid || projectId;
    if (!id) return;

    setErr(null);
    try {
      const res = await fetch(`/api/projects/${id}/exports`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "X-Org-Id": orgId,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load exports");
    }
  }

  async function requestExport(type: string) {
    if (!orgId || !projectId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/exports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "X-Org-Id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadExports(projectId);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to request export");
    } finally {
      setBusy(false);
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      loadExports().catch(() => {});
    }, 2500);
  }

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    loadProjects().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (!projectId) return;
    loadExports(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (shouldPoll) startPolling();
    else stopPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll]);

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Export Center</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{ padding: "8px 12px" }}
            onClick={() => nav("/projects")}
          >
            ← Projects
          </button>
          <button
            style={{ padding: "8px 12px" }}
            onClick={() => nav("/reviews")}
          >
            ← Approvals
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <div
        style={{
          marginTop: 12,
          border: "1px solid #333",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Select Project</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project..."
              style={{
                width: "100%",
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
              }}
            />

            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "transparent",
              }}
            >
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id.slice(0, 6)}…)
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              {projectId ? `ProjectId: ${projectId}` : "No project selected"}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>Actions</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => loadExports()}
                disabled={!projectId || busy}
                style={{ padding: "10px 12px" }}
              >
                Refresh
              </button>
              <button
                onClick={() => setItems([])}
                style={{ padding: "10px 12px" }}
              >
                Clear
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Auto-refresh: <b>{shouldPoll ? "ON" : "OFF"}</b>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        {EXPORTS.map((e) => (
          <button
            key={e.type}
            disabled={!projectId || busy}
            onClick={() => requestExport(e.type)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #333",
              background: "transparent",
            }}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((x) => (
          <div
            key={x.id}
            style={{
              border: "1px solid #333",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>
                {x.type} • <span style={{ opacity: 0.8 }}>{x.status}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {new Date(x.createdAt).toLocaleString()}
                {x.completedAt
                  ? ` • done ${new Date(x.completedAt).toLocaleString()}`
                  : ""}
              </div>
              {x.error && (
                <div style={{ color: "crimson", marginTop: 6 }}>{x.error}</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {x.status === "DONE" && (
                <a
                  href={`${apiBase()}/exports/${x.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ opacity: 0.7 }}>No exports yet for this project.</div>
        )}
      </div>
    </div>
  );
}
