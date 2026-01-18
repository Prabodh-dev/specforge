export type ArtifactRow = { id: string; type: string; title: string };

export type ProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  artifacts: ArtifactRow[];
};

export type VersionRow = {
  id: string;
  version: number;
  contentText?: string | null;
  contentJson?: any;
  createdAt: string;
  createdById: string | null;
};

export type ExportRow = {
  id: string;
  projectId: string;
  type: string;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  publicUrl?: string | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
};
