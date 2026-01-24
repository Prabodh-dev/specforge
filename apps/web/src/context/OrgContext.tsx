import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./AuthContext";

type OrgCtx = {
  orgId: string | null;
  orgName: string | null;
  setOrgId: (id: string | null) => void;
  setOrg: (org: { id: string; name?: string | null }) => void;
};

const OrgContext = createContext<OrgCtx | null>(null);
const ORG_KEY = "specforge_org_id";
const ORG_NAME_KEY = "specforge_org_name";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgIdState] = useState<string | null>(() =>
    localStorage.getItem(ORG_KEY),
  );
  const [orgName, setOrgName] = useState<string | null>(() =>
    localStorage.getItem(ORG_NAME_KEY),
  );
  const { token } = useAuth();

  function setOrgId(id: string | null) {
    setOrgIdState(id);
    if (id) localStorage.setItem(ORG_KEY, id);
    else localStorage.removeItem(ORG_KEY);
  }

  function setOrg(org: { id: string; name?: string | null }) {
    setOrgIdState(org.id);
    setOrgName(org.name ?? null);
    localStorage.setItem(ORG_KEY, org.id);
    if (org.name) localStorage.setItem(ORG_NAME_KEY, org.name);
    else localStorage.removeItem(ORG_NAME_KEY);
  }

  useEffect(() => {
    if (!orgId || orgName || !token) return;
    (async () => {
      try {
        const res = await apiFetch<{
          ok: true;
          orgs: { id: string; name: string }[];
        }>("/orgs", { token });
        const found = res.orgs.find((o) => o.id === orgId);
        if (found) {
          setOrgName(found.name);
          localStorage.setItem(ORG_NAME_KEY, found.name);
        }
      } catch {}
    })();
  }, [orgId, orgName, token]);

  const value = useMemo(
    () => ({ orgId, orgName, setOrgId, setOrg }),
    [orgId, orgName],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
