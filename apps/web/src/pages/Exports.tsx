import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { formatApiError } from "../lib/errors";

type ProjectRow = { id: string; name: string; description?: string | null };
type ArtifactRow = { id: string; type: string; title: string };
type VersionRow = {
  id: string;
  version: number;
  status: string;
  createdAt: string;
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

const EXPORT_TYPES = [
  { type: "PRD_MD", label: "PRD (Markdown)", artifactType: "PRD" },
  {
    type: "API_SPEC_JSON",
    label: "API Specification (JSON)",
    artifactType: "API_SPEC",
  },
  {
    type: "DB_SCHEMA_JSON",
    label: "DB Schema (JSON)",
    artifactType: "DB_SCHEMA",
  },
  { type: "SCAFFOLD_ZIP", label: "Scaffold (ZIP)", artifactType: null },
];

function apiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:4000";
}

export default function Exports() {
  const { token } = useAuth();
  const { orgId } = useOrg();
  const nav = useNavigate();

  const [step, setStep] = useState(1); // 1=Project, 2=Artifact, 3=Version, 4=Download

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");

  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRow | null>(
    null,
  );

  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionRow | null>(
    null,
  );

  const [exportType, setExportType] = useState("");
  const [exportId, setExportId] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q),
    );
  }, [projects, search]);

  async function loadProjects() {
    if (!orgId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/projects?orgId=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load projects");
    }
  }

  async function loadArtifacts() {
    if (!orgId || !projectId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-Id": orgId,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setArtifacts(data.project?.artifacts || []);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load artifacts");
    }
  }

  async function loadVersions() {
    if (!orgId || !selectedArtifact) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/artifacts/${selectedArtifact.id}/versions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Org-Id": orgId,
          },
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load versions");
    } finally {
      setBusy(false);
    }
  }

  async function requestExport() {
    if (!orgId || !projectId || !exportType) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/exports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-Id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: exportType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const expId = data.export?.id || "";
      console.log(`[export] Got exportId: ${expId}`);
      setExportId(expId);
      setExportStatus("QUEUED");
      startPolling(expId);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to request export");
    } finally {
      setBusy(false);
    }
  }

  async function checkExportStatus(expIdParam?: string) {
    try {
      const idToCheck = expIdParam || exportId;
      console.log(
        `[polling] checkExportStatus called, exportId=${idToCheck}, orgId=${orgId}`,
      );
      if (!idToCheck || !orgId) {
        console.log(
          `[polling] Early exit: exportId=${idToCheck}, orgId=${orgId}`,
        );
        return;
      }
      let exp: ExportRow | undefined;
      const res1 = await fetch(`/api/exports/${idToCheck}`, {
        headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId },
      });
      console.log(
        `[polling] GET /api/exports/${idToCheck} status=${res1.status}`,
      );
      if (res1.ok) {
        const d = await res1.json();
        console.log(`[polling] Response:`, d);
        exp = d.export as ExportRow;
      }

      if (!exp) {
        console.log(
          `[polling] Single fetch failed or returned empty, falling back to list`,
        );
        const res = await fetch(`/api/projects/${projectId}/exports`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Org-Id": orgId,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const idToCheck = expIdParam || exportId;
        exp = (data.items || []).find((x: ExportRow) => x.id === idToCheck);
        console.log(`[polling] Found in list:`, exp);
      }
      if (exp) {
        console.log(`[polling] Setting status to ${exp.status}`);
        setExportStatus(exp.status);
        if (exp.status === "DONE") {
          setToastOpen(true);
          stopPolling();
        }
        if (exp.status === "FAILED") {
          setToastOpen(true);
          stopPolling();
        }
      }
    } catch (e) {
      console.error("Failed to check export status", e);
    }
  }

  function startPolling(expId: string) {
    console.log(`[polling] startPolling called with expId=${expId}`);
    stopPolling();
    console.log(`[polling] Running immediate check`);
    checkExportStatus(expId).catch(() => {});
    pollRef.current = window.setInterval(() => {
      console.log(`[polling] Interval tick`);
      checkExportStatus(expId).catch(() => {});
    }, 1000);
  }

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function pickFilenameFromDisposition(
    disposition: string | null,
    fallback: string,
  ) {
    if (!disposition) return fallback;
    const matchUtf8 = disposition.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
    if (matchUtf8 && matchUtf8[1])
      return decodeURIComponent(matchUtf8[1].replace(/"/g, ""));
    const matchBasic = disposition.match(/filename="?([^";]+)"?/i);
    if (matchBasic && matchBasic[1]) return matchBasic[1];
    return fallback;
  }

  async function downloadCurrentExport() {
    if (!exportId) return;
    setDownloading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/download/${exportId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const contentDisposition = res.headers.get("content-disposition");
      const filename = pickFilenameFromDisposition(
        contentDisposition,
        `export-${exportId}`,
      );
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      setErr(formatApiError(e) || "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function handleNext() {
    if (step === 1 && projectId) {
      loadArtifacts();
      setStep(2);
    } else if (step === 2 && selectedArtifact) {
      loadVersions();
      setStep(3);
    } else if (step === 3 && selectedVersion) {
      setStep(4);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function resetWizard() {
    setStep(1);
    setProjectId("");
    setSelectedArtifact(null);
    setSelectedVersion(null);
    setExportType("");
    setExportId("");
    setExportStatus("");
    stopPolling();
    setToastOpen(false);
  }

  useEffect(() => {
    loadProjects().catch(() => {});
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 900,
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

      {toastOpen && exportId && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            background: "#111827",
            color: "#e5e7eb",
            border: "1px solid rgba(124,124,255,0.3)",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            minWidth: 260,
            zIndex: 9999,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {exportStatus === "DONE" ? "Export ready" : "Export failed"}
          </div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            {exportStatus === "DONE"
              ? "Your file is ready to download."
              : "There was a problem generating the export."}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {exportStatus === "DONE" && (
              <button
                className="primary"
                onClick={() => {
                  window.open(`/api/exports/${exportId}/download`, "_blank");
                  setToastOpen(false);
                }}
              >
                Download
              </button>
            )}
            <button className="ghost" onClick={() => setToastOpen(false)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      {/* Progress Indicator */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: step >= s ? "#7c7cff" : "#333",
                color: step >= s ? "#fff" : "#888",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {s}
            </div>
            {s < 4 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: step > s ? "#7c7cff" : "#333",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        {step === 1 && "Step 1: Select Project"}
        {step === 2 && "Step 2: Select Artifact"}
        {step === 3 && "Step 3: Select Version"}
        {step === 4 && "Step 4: Download"}
      </div>

      {/* Step Content */}
      <div
        style={{
          marginTop: 20,
          border: "1px solid #333",
          borderRadius: 12,
          padding: 24,
          minHeight: 300,
        }}
      >
        {/* Step 1: Select Project */}
        {step === 1 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Select Project</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #333",
                marginBottom: 12,
              }}
            />
            <div style={{ display: "grid", gap: 10 }}>
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: `2px solid ${projectId === p.id ? "#7c7cff" : "#333"}`,
                    background:
                      projectId === p.id ? "#7c7cff22" : "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {p.description && (
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                      {p.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Artifact */}
        {step === 2 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Select Artifact Type</h3>
            <div style={{ marginBottom: 16, opacity: 0.7 }}>
              Project: <b>{selectedProject?.name}</b>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {EXPORT_TYPES.map((e) => (
                <button
                  key={e.type}
                  onClick={() => {
                    setExportType(e.type);
                    const artifact = artifacts.find(
                      (a) => a.type === e.artifactType,
                    );
                    setSelectedArtifact(artifact || null);
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: `2px solid ${exportType === e.type ? "#7c7cff" : "#333"}`,
                    background:
                      exportType === e.type ? "#7c7cff22" : "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{e.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Version */}
        {step === 3 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Select Version</h3>
            <div style={{ marginBottom: 16, opacity: 0.7 }}>
              Project: <b>{selectedProject?.name}</b> • Export:{" "}
              <b>{EXPORT_TYPES.find((e) => e.type === exportType)?.label}</b>
            </div>
            {busy ? (
              <div>Loading versions...</div>
            ) : versions.length === 0 ? (
              <div style={{ opacity: 0.7 }}>
                No versions available. Use latest.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: `2px solid ${selectedVersion?.id === v.id ? "#7c7cff" : "#333"}`,
                      background:
                        selectedVersion?.id === v.id
                          ? "#7c7cff22"
                          : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>Version {v.version}</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                      {v.status} • {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {versions.length === 0 && (
              <button
                onClick={() =>
                  setSelectedVersion({
                    id: "latest",
                    version: 0,
                    status: "LATEST",
                    createdAt: new Date().toISOString(),
                  })
                }
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "2px solid #7c7cff",
                  background: "#7c7cff22",
                  width: "100%",
                }}
              >
                Use Latest Version
              </button>
            )}
          </div>
        )}

        {/* Step 4: Download */}
        {step === 4 && (
          <div>
            <h3 style={{ marginTop: 0 }}>Download Export</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ opacity: 0.7, marginBottom: 8 }}>
                Project: <b>{selectedProject?.name}</b>
              </div>
              <div style={{ opacity: 0.7, marginBottom: 8 }}>
                Export Type:{" "}
                <b>{EXPORT_TYPES.find((e) => e.type === exportType)?.label}</b>
              </div>
              <div style={{ opacity: 0.7 }}>
                Version: <b>{selectedVersion?.version || "Latest"}</b>
              </div>
            </div>

            {!exportId ? (
              <button
                onClick={requestExport}
                disabled={busy}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "2px solid #7c7cff",
                  background: "#7c7cff",
                  color: "#fff",
                  fontWeight: 700,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                {busy ? "Generating..." : "Generate Export"}
              </button>
            ) : (
              <div>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #333",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    Status:{" "}
                    <span
                      style={{
                        color: exportStatus === "DONE" ? "#4ade80" : "#fbbf24",
                      }}
                    >
                      {exportStatus}
                    </span>
                  </div>
                  {exportStatus === "QUEUED" && (
                    <div style={{ opacity: 0.7 }}>
                      Export is queued for processing...
                    </div>
                  )}
                  {exportStatus === "PROCESSING" && (
                    <div style={{ opacity: 0.7 }}>
                      Processing your export...
                    </div>
                  )}
                  {exportStatus === "DONE" && (
                    <button
                      onClick={downloadCurrentExport}
                      disabled={downloading}
                      style={{
                        display: "inline-block",
                        marginTop: 12,
                        padding: 12,
                        background: "#4ade80",
                        color: "#000",
                        borderRadius: 8,
                        fontWeight: 700,
                        border: "none",
                        cursor: downloading ? "wait" : "pointer",
                      }}
                    >
                      {downloading ? "Preparing..." : "📥 Download Now"}
                    </button>
                  )}
                  {exportStatus === "FAILED" && (
                    <div style={{ color: "crimson" }}>
                      Export failed. Please try again.
                    </div>
                  )}
                </div>
                <button
                  onClick={resetWizard}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #333",
                    background: "transparent",
                    width: "100%",
                  }}
                >
                  Start New Export
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={handleBack}
          disabled={step === 1}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "transparent",
            opacity: step === 1 ? 0.5 : 1,
            cursor: step === 1 ? "not-allowed" : "pointer",
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={
            (step === 1 && !projectId) ||
            (step === 2 && !exportType) ||
            (step === 3 && !selectedVersion) ||
            step === 4
          }
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "2px solid #7c7cff",
            background: "#7c7cff",
            color: "#fff",
            fontWeight: 700,
            opacity:
              (step === 1 && !projectId) ||
              (step === 2 && !exportType) ||
              (step === 3 && !selectedVersion) ||
              step === 4
                ? 0.5
                : 1,
            cursor:
              (step === 1 && !projectId) ||
              (step === 2 && !exportType) ||
              (step === 3 && !selectedVersion) ||
              step === 4
                ? "not-allowed"
                : "pointer",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
