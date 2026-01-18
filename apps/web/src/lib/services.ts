import { apiFetch } from "./api";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import type { ArtifactRow, ProjectRow, VersionRow, ExportRow } from "./types";

export type { ArtifactRow, ProjectRow, VersionRow, ExportRow };

export function useProjectService() {
  const { token } = useAuth();
  const { orgId } = useOrg();

  return {
    async getProject(projectId: string) {
      if (!projectId || !orgId) return null;
      const res = await apiFetch<{ ok: true; project: ProjectRow }>(
        `/projects/${projectId}`,
        { token, orgId },
      );
      return res.project;
    },

    async listProjects() {
      if (!orgId) return [];
      const res = await apiFetch<{ ok: true; projects: ProjectRow[] }>(
        "/projects",
        { token, orgId },
      );
      return res.projects;
    },

    async createProject(name: string, description?: string) {
      if (!orgId) return null;
      const res = await apiFetch<{ ok: true; project: ProjectRow }>(
        "/projects",
        {
          token,
          orgId,
          method: "POST",
          body: { name, description: description || undefined },
        },
      );
      return res.project;
    },
  };
}

export function useArtifactService() {
  const { token } = useAuth();
  const { orgId } = useOrg();

  return {
    async getVersions(artifactId: string) {
      if (!orgId || !artifactId) return [];
      const res = await apiFetch<{ ok: true; versions: VersionRow[] }>(
        `/artifacts/${artifactId}/versions`,
        { token, orgId },
      );
      return res.versions;
    },

    async saveVersion(
      artifactId: string,
      contentText: string,
      contentJson?: any,
    ) {
      if (!orgId || !artifactId) return null;
      await apiFetch(`/artifacts/${artifactId}/versions`, {
        token,
        orgId,
        method: "POST",
        body: { contentText, contentJson },
      });
      return this.getVersions(artifactId);
    },
  };
}

export function useExportService() {
  const { token } = useAuth();
  const { orgId } = useOrg();

  return {
    async listExports(projectId: string) {
      if (!orgId || !projectId) return [];
      const res = await apiFetch<{ ok: true; items: ExportRow[] }>(
        `/projects/${projectId}/exports`,
        { token, orgId },
      );
      return res.items;
    },

    async requestExport(projectId: string, type: string) {
      if (!orgId || !projectId) return null;
      await apiFetch(`/projects/${projectId}/exports`, {
        token,
        orgId,
        method: "POST",
        body: { type },
      });
      return this.listExports(projectId);
    },
  };
}
