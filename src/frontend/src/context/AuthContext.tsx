import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export type AuthRole = "admin" | "penyuluh" | null;

interface AuthContextValue {
  role: AuthRole;
  isLoggedIn: boolean;
  isApproved: boolean;
  isLoadingAuth: boolean;
  refetchAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  role: null,
  isLoggedIn: false,
  isApproved: false,
  isLoadingAuth: true,
  refetchAuth: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [role, setRole] = useState<AuthRole>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
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
        isLoggedIn: !!identity,
        isApproved,
        isLoadingAuth,
        refetchAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
