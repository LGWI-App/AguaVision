import {
  createContext,
  use,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";

import { useStorageState } from "./useStorageState";
import { DEFAULT_COMMUNITY_ID, setActiveCommunityId } from "../../lib/db";

type AuthSession = {
  communityId: number;
  locationName: string;
  loggedInAt: string;
};

function parseSession(raw: string | null | undefined): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.communityId === "number" &&
      parsed.communityId > 0 &&
      typeof parsed.locationName === "string"
    ) {
      return {
        communityId: parsed.communityId,
        locationName: parsed.locationName,
        loggedInAt:
          typeof parsed.loggedInAt === "string"
            ? parsed.loggedInAt
            : new Date().toISOString(),
      };
    }
  } catch {
    // Ignore malformed persisted values and force fresh login.
  }
  return null;
}

const AuthContext = createContext<{
  signIn: (payload: { communityId: number; locationName: string }) => void;
  signOut: () => void;
  session?: string | null;
  communityId: number;
  locationName: string | null;
  isLoading: boolean;
}>({
  signIn: () => null,
  signOut: () => null,
  session: null,
  communityId: DEFAULT_COMMUNITY_ID,
  locationName: null,
  isLoading: false,
});

// Use this hook to access the user info.
export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState("session");
  const parsedSession = useMemo(() => parseSession(session), [session]);
  const communityId = parsedSession?.communityId ?? DEFAULT_COMMUNITY_ID;
  const effectiveSession = parsedSession ? session : null;

  useEffect(() => {
    // Migrate old/invalid stored sessions so auth guard is reliable.
    if (!isLoading && session && !parsedSession) {
      setSession(null);
    }
  }, [isLoading, parsedSession, session, setSession]);

  useEffect(() => {
    setActiveCommunityId(communityId);
  }, [communityId]);

  return (
    <AuthContext
      value={{
        signIn: ({ communityId: selectedId, locationName }) => {
          setActiveCommunityId(selectedId);
          setSession(
            JSON.stringify({
              communityId: selectedId,
              locationName,
              loggedInAt: new Date().toISOString(),
            } satisfies AuthSession),
          );
        },
        signOut: () => {
          setActiveCommunityId(DEFAULT_COMMUNITY_ID);
          setSession(null);
        },
        session: effectiveSession,
        communityId,
        locationName: parsedSession?.locationName ?? null,
        isLoading,
      }}
    >
      {children}
    </AuthContext>
  );
}
