import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrg } from "../context/OrgContext";
import { TERMINOLOGY, getReviewStatusLabel } from "../lib/terminology";
import { LoadingSpinner, Badge } from "../components/common";
import { formatApiError } from "../lib/errors";

type ReviewRow = {
  id: string;
  projectId: string;
  artifactType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  reviewerNote?: string | null;
  llmRunId?: string | null;
};

export default function Reviews() {
  const { orgId } = useOrg();
  const nav = useNavigate();

  const [items, setItems] = useState<ReviewRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/reviews`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "X-Org-Id": orgId,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      setErr(formatApiError(e) || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (!orgId) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        No org selected. Go to <Link to="/orgs">organizations</Link>.
      </div>
    );
  }

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
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0, marginBottom: 4 }}>Approvals</h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
            Review and approve generated documents
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? <LoadingSpinner /> : "↻"} Refresh
          </button>
        </div>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: "#2a0a0a",
            borderRadius: 8,
            color: "#ff6b6b",
          }}
        >
          {err}
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #333",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {r.artifactType}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Badge>{getReviewStatusLabel(r.status)}</Badge>
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.reviewerNote && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.8,
                    borderLeft: "2px solid #7c7cff",
                    paddingLeft: 8,
                  }}
                >
                  {r.reviewerNote}
                </div>
              )}
            </div>

            <button
              onClick={() => nav(`/reviews/${r.id}`)}
              style={{ padding: "10px 14px", whiteSpace: "nowrap" }}
            >
              Review
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, opacity: 0.6 }}>
            No approvals pending. You're all caught up!
          </div>
        )}
      </div>
    </div>
  );
}
