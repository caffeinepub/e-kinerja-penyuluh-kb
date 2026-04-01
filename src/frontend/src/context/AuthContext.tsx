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

const ADMIN_TOKEN = "ekinerja-admin-2024";

interface AuthContextValue {
  role: AuthRole;
  isLoggedIn: boolean;
  isApproved: boolean;
  isLoadingAuth: boolean;
  isTokenAuth: boolean;
  refetchAuth: () => void;
  logoutToken: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  role: null,
  isLoggedIn: false,
  isApproved: false,
  isLoadingAuth: true,
  isTokenAuth: false,
  refetchAuth: () => {},
  logoutToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [role, setRole] = useState<AuthRole>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isTokenAuth, setIsTokenAuth] = useState(false);

  const logoutToken = useCallback(() => {
    clearSessionParameter("adminToken");
    setIsTokenAuth(false);
    setRole(null);
    setIsApproved(false);
  }, []);

  const refetchAuth = () => {
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
    // Check for token-based admin auth first
    const token = getPersistedUrlParameter("adminToken");
    if (token === ADMIN_TOKEN) {
      setRole("admin");
      setIsApproved(true);
      setIsTokenAuth(true);
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
  }, [identity, actor, isFetching, isInitializing]);

  return (
    <AuthContext.Provider
      value={{
        role,
        isLoggedIn: isTokenAuth || !!identity,
        isApproved,
        isLoadingAuth,
        isTokenAuth,
        refetchAuth,
        logoutToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
