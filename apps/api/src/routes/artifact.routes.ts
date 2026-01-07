import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember } from "../middlewares/org";
import {
  getArtifact,
  listArtifactVersions,
  createArtifactVersion,
} from "../controllers/artifact.controller";

export const artifactRouter = Router();

artifactRouter.use(requireAuth);
artifactRouter.use(requireOrgMember);

artifactRouter.get("/:artifactId", getArtifact);

artifactRouter.get("/:artifactId/versions", listArtifactVersions);
artifactRouter.post("/:artifactId/versions", createArtifactVersion);
