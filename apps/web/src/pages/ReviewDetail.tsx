import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";

type ReviewItem = {
  id: string;
  projectId: string;
  artifactType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  inputJson?: any;
  outputText?: string | null;
  outputJson?: any;
  reviewerNote?: string | null;
  llmRunId?: string | null;
  createdAt: string;
};

type LatestArtifactVersion = {
  version: number;
  contentText?: string | null;
  contentJson?: any;
  createdAt: string;
};

export default function ReviewDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { orgId } = useOrg();
  const nav = useNavigate();

  const [item, setItem] = useState<ReviewItem | null>(null);
  const [latest, setLatest] = useState<LatestArtifactVersion | null>(null);

  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isJson = useMemo(() => {
    const t = item?.artifactType;
    return (
      t === "API_SPEC" ||
      t === "DB_SCHEMA" ||
      t === "USER_STORIES" ||
      t === "TASK_BREAKDOWN"
    );
  }, [item?.artifactType]);

  async function load() {
    if (!orgId || !id) return;
    setErr(null);

    const res = await apiFetch<{
      ok: true;
      item: ReviewItem;
      latest: LatestArtifactVersion | null;
    }>(`/reviews/${id}`, { token, orgId });

    setItem(res.item);
    setLatest(res.latest);
    setNote(res.item.reviewerNote || "");
  }

  useEffect(() => {
    load().catch((e) => setErr(JSON.stringify(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orgId]);

  async function approve() {
    if (!orgId || !id) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/reviews/${id}/approve`, {
        token,
        orgId,
        method: "POST",
        body: { reviewerNote: note },
      });
      await load();
    } catch (e: any) {
      setErr(typeof e === "string" ? e : JSON.stringify(e));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!orgId || !id) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/reviews/${id}/reject`, {
        token,
        orgId,
        method: "POST",
        body: { reviewerNote: note },
      });
      await load();
    } catch (e: any) {
      setErr(typeof e === "string" ? e : JSON.stringify(e));
    } finally {
      setBusy(false);
    }
  }

  if (!orgId) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        No org selected. Go to <Link to="/orgs">/orgs</Link>.
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Loading...
        {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
      </div>
    );
  }

  const proposed = isJson
    ? JSON.stringify(item.outputJson ?? {}, null, 2)
    : (item.outputText ?? "");

  const current = latest
    ? isJson
      ? JSON.stringify(latest.contentJson ?? {}, null, 2)
      : (latest.contentText ?? "")
    : "";

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1200,
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
        <div>
          <h2 style={{ margin: 0 }}>Review Detail</h2>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            {item.artifactType} • {item.status} •{" "}
            {new Date(item.createdAt).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/reviews">Back</Link>
          <button
            onClick={() => nav(`/projects/${item.projectId}`)}
            style={{ padding: "10px 12px" }}
          >
            Project
          </button>
          <button
            onClick={approve}
            disabled={busy || item.status !== "PENDING"}
            style={{ padding: "10px 12px" }}
          >
            Approve
          </button>
          <button
            onClick={reject}
            disabled={busy || item.status !== "PENDING"}
            style={{ padding: "10px 12px" }}
          >
            Reject
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Reviewer note</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (why approve/reject)"
          style={{
            width: "100%",
            minHeight: 80,
            resize: "vertical",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 10,
            marginTop: 8,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div
          style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}
        >
          <div style={{ fontWeight: 800 }}>Current (latest version)</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            {latest
              ? `v${latest.version} • ${new Date(latest.createdAt).toLocaleString()}`
              : "No versions yet"}
          </div>
          <textarea
            readOnly
            value={current}
            style={{
              marginTop: 10,
              width: "100%",
              height: 520,
              border: "1px solid #333",
              borderRadius: 10,
              padding: 10,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 12,
            }}
          />
        </div>

        <div
          style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}
        >
          <div style={{ fontWeight: 800 }}>Proposed (LLM output)</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            Review ID: {item.id}
          </div>
          <div
            style={{
              marginTop: 10,
              width: "100%",
              height: 520,
              border: "1px solid #333",
              borderRadius: 10,
              padding: 10,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 12,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.5,
              color: proposed?.includes("not implemented")
                ? "#ff6b6b"
                : "#7c7cff",
            }}
          >
            {proposed || "(no output)"}
          </div>
        </div>
      </div>
    </div>
  );
}
