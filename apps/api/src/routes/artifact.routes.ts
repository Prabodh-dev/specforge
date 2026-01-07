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

// fetch artifact details
artifactRouter.get("/:artifactId", getArtifact);

// versions
artifactRouter.get("/:artifactId/versions", listArtifactVersions);
artifactRouter.post("/:artifactId/versions", createArtifactVersion);
