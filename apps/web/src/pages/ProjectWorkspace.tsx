import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { InfoTooltip } from "../components/common";
import {
  getWorkflowDescription,
  getExportDescription,
} from "../lib/terminology";

const WORKFLOWS = [
  { key: "GENERATE_PRD", label: "Generate PRD", artifactType: "PRD" },
  {
    key: "GENERATE_USER_STORIES",
    label: "Generate User Stories",
    artifactType: "USER_STORIES",
  },
  {
    key: "GENERATE_API_SPEC",
    label: "Generate API Specification",
    artifactType: "API_SPEC",
  },
  {
    key: "GENERATE_DB_SCHEMA",
    label: "Generate DB Schema",
    artifactType: "DB_SCHEMA",
  },
  {
    key: "GENERATE_TASK_BREAKDOWN",
    label: "Generate Task Breakdown",
    artifactType: "TASK_BREAKDOWN",
  },
] as const;

const EXPORTS = [
  { type: "PRD_MD", label: "PRD (Markdown)" },
  { type: "API_SPEC_JSON", label: "API Specification (JSON)" },
  { type: "DB_SCHEMA_JSON", label: "DB Schema (JSON)" },
  { type: "SCAFFOLD_ZIP", label: "Scaffold (ZIP)" },
] as const;

type Artifact = { id: string; type: string; title: string };
type Project = {
  id: string;
  name: string;
  description?: string | null;
  artifacts: Artifact[];
};

type VersionRow = {
  id: string;
  version: number;
  contentText?: string | null;
  contentJson?: any;
  createdAt: string;
  createdById: string | null;
};

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

function isJsonType(type: string) {
  return (
    type === "API_SPEC" ||
    type === "DB_SCHEMA" ||
    type === "USER_STORIES" ||
    type === "TASK_BREAKDOWN"
  );
}

function apiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:4000";
}

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const { token } = useAuth();
  const { orgId } = useOrg();

  const [project, setProject] = useState<Project | null>(null);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const [selectedArtifactType, setSelectedArtifactType] = useState<
    string | null
  >(null);

  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [editorText, setEditorText] = useState("");

  const [idea, setIdea] = useState("");
  const [workflowKey, setWorkflowKey] =
    useState<(typeof WORKFLOWS)[number]["key"]>("GENERATE_PRD");

  const [exportsList, setExportsList] = useState<ExportRow[]>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const selectedArtifact = useMemo(
    () => project?.artifacts.find((a) => a.id === selectedArtifactId) || null,
    [project, selectedArtifactId],
  );

  const selectedWorkflowMeta = useMemo(
    () => WORKFLOWS.find((w) => w.key === workflowKey)!,
    [workflowKey],
  );

  const shouldPollExports = useMemo(() => {
    return exportsList.some(
      (x) => x.status === "QUEUED" || x.status === "PROCESSING",
    );
  }, [exportsList]);

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      if (projectId) loadExports(projectId).catch(() => {});
    }, 2500);
  }

  async function loadProject() {
    if (!projectId || !orgId) return;
    setErr(null);

    const res = await apiFetch<{ ok: true; project: Project }>(
      `/projects/${projectId}`,
      {
        token,
        orgId,
      },
    );

    setProject(res.project);

    const prd = res.project.artifacts.find((a) => a.type === "PRD");
    const first = prd || res.project.artifacts[0];

    setSelectedArtifactId(first?.id || null);
    setSelectedArtifactType(first?.type || null);
  }

  async function loadVersions(artifactId: string) {
    if (!orgId) return;

    const res = await apiFetch<{ ok: true; versions: VersionRow[] }>(
      `/artifacts/${artifactId}/versions`,
      { token, orgId },
    );

    setVersions(res.versions);

    const latest = res.versions[0];
    if (!latest) {
      setEditorText("");
      return;
    }

    if (latest.contentText) setEditorText(latest.contentText);
    else if (latest.contentJson)
      setEditorText(JSON.stringify(latest.contentJson, null, 2));
    else setEditorText("");
  }

  async function loadExports(pid: string) {
    if (!orgId) return;
    const res = await apiFetch<{ ok: true; items: ExportRow[] }>(
      `/projects/${pid}/exports`,
      {
        token,
        orgId,
      },
    );
    setExportsList(res.items);
  }

  useEffect(() => {
    loadProject().catch((e) =>
      setErr(typeof e === "string" ? e : JSON.stringify(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, orgId]);

  useEffect(() => {
    if (!selectedArtifactId) return;
    loadVersions(selectedArtifactId).catch((e) =>
      setErr(typeof e === "string" ? e : JSON.stringify(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArtifactId]);

  useEffect(() => {
    if (!projectId) return;
    loadExports(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (shouldPollExports) startPolling();
    else stopPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPollExports]);

  async function saveNewVersion() {
    if (!selectedArtifactId || !selectedArtifactType || !orgId) return;

    setSaving(true);
    setErr(null);
    try {
      const body: any = {};

      if (isJsonType(selectedArtifactType)) {
        try {
          body.contentJson = JSON.parse(editorText || "{}");
        } catch {
          setErr("Invalid JSON in editor.");
          setSaving(false);
          return;
        }
      } else {
        body.contentText = editorText;
      }

      await apiFetch(`/artifacts/${selectedArtifactId}/versions`, {
        token,
        orgId,
        method: "POST",
        body,
      });

      await loadVersions(selectedArtifactId);
    } catch (e: any) {
      setErr(typeof e === "string" ? e : JSON.stringify(e));
    } finally {
      setSaving(false);
    }
  }

  async function runWorkflow() {
    if (!projectId || !orgId) return;
    if (!idea.trim()) {
      setErr("Enter an idea before running a workflow.");
      return;
    }

    setRunning(true);
    setErr(null);
    try {
      await apiFetch(`/projects/${projectId}/workflows/${workflowKey}/run`, {
        token,
        orgId,
        method: "POST",
        body: { idea },
      });

      // If you added latest-review endpoint earlier, keep this.
      // If not, it will fallback to /reviews.
      try {
        const latest = await apiFetch<{
          ok: true;
          item: { id: string } | null;
        }>(
          `/projects/${projectId}/reviews/latest?artifactType=${selectedWorkflowMeta.artifactType}`,
          { token, orgId },
        );
        if (latest.item?.id) nav(`/reviews/${latest.item.id}`);
        else nav(`/reviews`);
      } catch {
        nav(`/reviews`);
      }
    } catch (e: any) {
      setErr(typeof e === "string" ? e : JSON.stringify(e));
    } finally {
      setRunning(false);
    }
  }

  async function requestExport(type: string) {
    if (!projectId || !orgId) return;
    setExportBusy(true);
    setErr(null);
    try {
      await apiFetch(`/projects/${projectId}/exports`, {
        token,
        orgId,
        method: "POST",
        body: { type },
      });
      await loadExports(projectId);
    } catch (e: any) {
      setErr(typeof e === "string" ? e : JSON.stringify(e));
    } finally {
      setExportBusy(false);
    }
  }

  if (!orgId) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <div style={{ color: "crimson" }}>
          No org selected. Go to <Link to="/orgs">/orgs</Link>.
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <div>Loading project...</div>
        {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "280px 1fr 360px",
        fontFamily: "system-ui",
      }}
    >
      {/* Sidebar */}
      <div
        style={{ borderRight: "1px solid #333", padding: 12, overflow: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <strong
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project.name}
          </strong>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/projects">Back</Link>
            <Link to="/reviews">Reviews</Link>
          </div>
        </div>

        <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>
          {project.description || "—"}
        </div>

        {/* Run Workflow */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: "1px solid #333",
            borderRadius: 12,
          }}
        >
          <div
            style={{ fontWeight: 800, display: "flex", alignItems: "center" }}
          >
            Run Workflow
            <InfoTooltip text="Generate product specifications automatically. Choose what you want to create (PRD, user stories, API specs, etc.) and the AI will build it based on your idea." />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>Idea</div>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Paste product idea here (one time)"
            style={{
              width: "100%",
              minHeight: 90,
              resize: "vertical",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              marginTop: 6,
            }}
          />

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Workflow
          </div>
          <select
            value={workflowKey}
            onChange={(e) => setWorkflowKey(e.target.value as any)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              marginTop: 6,
              background: "transparent",
            }}
          >
            {WORKFLOWS.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>

          {workflowKey && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                opacity: 0.7,
                lineHeight: 1.4,
              }}
            >
              {getWorkflowDescription(workflowKey)}
            </div>
          )}

          <button
            onClick={runWorkflow}
            disabled={running}
            style={{ width: "100%", marginTop: 10, padding: "10px 12px" }}
          >
            {running ? "Running..." : "Generate"}
          </button>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Results are sent to your Review Queue for approval.
          </div>
        </div>

        {/* Artifacts */}
        <div style={{ marginTop: 14, fontWeight: 700 }}>Artifacts</div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {project.artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedArtifactId(a.id);
                setSelectedArtifactType(a.type);
              }}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 10,
                border:
                  selectedArtifactId === a.id
                    ? "2px solid #7c3aed"
                    : "1px solid #333",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{a.type}</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>{a.title}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          Tip: JSON artifacts (API_SPEC/DB_SCHEMA/USER_STORIES/TASK_BREAKDOWN)
          require valid JSON to save.
        </div>
      </div>

      {/* Editor */}
      <div
        style={{
          padding: 12,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {selectedArtifact?.type || ""} Editor
            </div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              {selectedArtifact?.title || ""}
            </div>
          </div>

          <button
            onClick={saveNewVersion}
            disabled={saving || !selectedArtifactId}
            style={{ padding: "10px 12px" }}
          >
            {saving ? "Saving..." : "Save as New Version"}
          </button>
        </div>

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <textarea
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          style={{
            width: "100%",
            height: "100%",
            resize: "none",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #333",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        />

        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Current artifact: <b>{selectedArtifact?.type}</b> • Versions:{" "}
          <b>{versions.length}</b>
        </div>
      </div>

      {/* Versions */}
      <div
        style={{ borderLeft: "1px solid #333", padding: 12, overflow: "auto" }}
      >
        <div style={{ fontWeight: 800 }}>Versions</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                if (v.contentText) setEditorText(v.contentText);
                else if (v.contentJson)
                  setEditorText(JSON.stringify(v.contentJson, null, 2));
              }}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>v{v.version}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          {versions.length === 0 && (
            <div style={{ opacity: 0.7 }}>No versions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
