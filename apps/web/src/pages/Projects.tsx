import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjectService } from "../lib/services";
import type { ProjectRow } from "../lib/types";
import { useOrg } from "../context/OrgContext";
import { LoadingSpinner } from "../components/common";
import { formatApiError } from "../lib/errors";

export default function Projects() {
  const nav = useNavigate();
  const { orgId } = useOrg();
  const projectService = useProjectService();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    try {
      const list = await projectService.listProjects();
      setProjects(list);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load projects");
    }
  }

  async function createProject() {
    if (!name.trim()) {
      setErr("Project name required");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const project = await projectService.createProject(name, description);
      if (project) {
        setName("");
        setDescription("");
        nav(`/projects/${project.id}`);
      }
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) loadProjects();
  }, [orgId]);

  if (!orgId) {
    return (
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Your Projects</h2>
        <div className="alert error">
          No organization selected. Go to <Link to="/orgs">Organizations</Link>{" "}
          and select one.
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Your Projects</h2>
          <div className="muted">
            Create and manage your product specifications
          </div>
        </div>
        <Link
          to="/orgs"
          className="ghost"
          style={{ padding: "8px 12px", textDecoration: "none" }}
        >
          Change organization
        </Link>
      </div>

      {err && <div className="alert error">{err}</div>}

      <div className="grid-2">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Create New Project</h3>
          <div className="stack">
            <div className="form-group">
              <label>Project Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mobile Banking App"
                disabled={loading}
              />
              <div className="form-hint">
                Give your project a descriptive name
              </div>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this project do? What's its purpose?"
                style={{ minHeight: 90 }}
                disabled={loading}
              />
              <div className="form-hint">
                This helps the AI understand your project
              </div>
            </div>
            <button
              className="primary"
              disabled={loading || !name.trim()}
              onClick={createProject}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading && <LoadingSpinner />}
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Your Projects ({projects.length})</h3>
          <div className="card-list">
            {projects.length > 0 ? (
              projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {p.name}
                  </div>
                  <div
                    className="muted"
                    style={{ fontSize: 13, marginBottom: 8 }}
                  >
                    {p.description || "No description"}
                  </div>
                  <div className="badge" style={{ fontSize: 12 }}>
                    {p.artifacts?.length || 0} documents
                  </div>
                </Link>
              ))
            ) : (
              <div
                className="muted"
                style={{ textAlign: "center", padding: 24 }}
              >
                No projects yet. Create one to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
