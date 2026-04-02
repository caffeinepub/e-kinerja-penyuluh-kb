import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  clearSessionParameter,
  getPersistedUrlParameter,
} from "../utils/urlParams";

export type AuthRole = "admin" | "penyuluh" | null;

export const ADMIN_TOKEN = "ekinerja-admin-2024";

interface AuthContextValue {
  role: AuthRole;
  isLoggedIn: boolean;
  isApproved: boolean;
  isLoadingAuth: boolean;
  isTokenAuth: boolean;
  hasAdminToken: boolean;
  isLocalAdmin: boolean;
  refetchAuth: () => void;
  logoutToken: () => void;
  logoutLocalAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  role: null,
  isLoggedIn: false,
  isApproved: false,
  isLoadingAuth: true,
  isTokenAuth: false,
  hasAdminToken: false,
  isLocalAdmin: false,
  refetchAuth: () => {},
  logoutToken: () => {},
  logoutLocalAdmin: () => {},
});

// Check if current principal is auto-registered (skips admin approval)
function isAutoRegistered(principal: string): boolean {
  try {
    const list: string[] = JSON.parse(
      localStorage.getItem("ekinerja_auto_registered") || "[]",
    );
    return list.includes(principal);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [role, setRole] = useState<AuthRole>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Check if admin token is present (from URL or session)
  const hasAdminToken = getPersistedUrlParameter("adminToken") === ADMIN_TOKEN;

  // Check if local admin mode is active (password-based login)
  const isLocalAdmin = localStorage.getItem("localAdminMode") === "true";

  const logoutToken = useCallback(() => {
    clearSessionParameter("adminToken");
    setRole(null);
    setIsApproved(false);
  }, []);

  const logoutLocalAdmin = useCallback(() => {
    localStorage.removeItem("localAdminMode");
    window.location.reload();
  }, []);

  const refetchAuth = () => {
    if (isLocalAdmin) {
      setRole("admin");
      setIsApproved(true);
      setIsLoadingAuth(false);
      return;
    }

    // Check auto-registration first
    if (identity) {
      const principal = identity.getPrincipal().toString();
      if (isAutoRegistered(principal)) {
        setRole("penyuluh");
        setIsApproved(true);
        setIsLoadingAuth(false);
        return;
      }
    }

    if (!actor) return;
    setIsLoadingAuth(true);
    Promise.all([actor.isCallerAdmin(), actor.isCallerApproved()])
      .then(([admin, approved]) => {
        setRole(admin ? "admin" : "penyuluh");
        setIsApproved(approved);
      })
      .catch(() => {
        setRole(null);
        setIsApproved(false);
      })
      .finally(() => setIsLoadingAuth(false));
  };

  useEffect(() => {
    // Local admin mode: skip Internet Identity entirely
    if (isLocalAdmin) {
      setRole("admin");
      setIsApproved(true);
      setIsLoadingAuth(false);
      return;
    }

    if (isInitializing || isFetching) return;
    if (!identity || !actor) {
      setRole(null);
      setIsApproved(false);
      setIsLoadingAuth(false);
      return;
    }

    // Check auto-registration before calling backend
    const principal = identity.getPrincipal().toString();
    if (isAutoRegistered(principal)) {
      setRole("penyuluh");
      setIsApproved(true);
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);
    Promise.all([actor.isCallerAdmin(), actor.isCallerApproved()])
      .then(([admin, approved]) => {
        setRole(admin ? "admin" : "penyuluh");
        setIsApproved(approved);
      })
      .catch(() => {
        setRole(null);
        setIsApproved(false);
      })
      .finally(() => setIsLoadingAuth(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, actor, isFetching, isInitializing, isLocalAdmin]);

  return (
    <AuthContext.Provider
      value={{
        role,
        isLoggedIn: isLocalAdmin || !!identity,
        isApproved,
        isLoadingAuth,
        isTokenAuth: hasAdminToken,
        hasAdminToken,
        isLocalAdmin,
        refetchAuth,
        logoutToken,
        logoutLocalAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
