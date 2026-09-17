import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { getPostLoginPath } from "@/lib/authUtils";

export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: string;
  discountPercentage?: string | number | null;
  milesMarkupType?: string | null;
  milesMarkupValue?: string | number | null;
  milesMarkupTypeLifemiles?: string | null;
  milesMarkupValueLifemiles?: string | number | null;
  milesMarkupTypeSmiles?: string | null;
  milesMarkupValueSmiles?: string | number | null;
  milesProgramsAllowed?: string | null;
  enabledModules?: {
    quote?: boolean;
    quoteExpress?: boolean;
    dayCounter?: boolean;
    milesCalculator?: boolean;
    academy?: boolean;
    cosmos?: boolean;
    cosmosVoice?: boolean;
  } | null;
  createdAt: string;
}

export type LoginResult =
  | { user: User }
  | { needs2FA: true; tempToken: string; message?: string; emailMasked?: string; devCode?: string };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  resend2FA: (tempToken: string, loginIdentifier?: string) => Promise<{ tempToken: string; emailMasked?: string; message?: string; devCode?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string | null }) => Promise<void>;
}

const AUTH_CACHE_KEY = "cosmos-auth-user";

function readAuthCache(): User | null {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return parsed?.id && parsed?.role ? parsed : null;
  } catch {
    return null;
  }
}

function writeAuthCache(user: User | null) {
  try {
    if (user) sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function prefetchAfterAuth(queryClient: ReturnType<typeof useQueryClient>, user: User) {
  void queryClient.prefetchQuery({ queryKey: ["/api/settings/global-trm"] });
  if (user.role === "agency" || user.role === "super_admin") {
    void queryClient.prefetchQuery({ queryKey: ["/api/destinations-previews?isActive=true"] });
    void queryClient.prefetchQuery({ queryKey: ["/api/destinations?isActive=true"] });
  }
  const path = getPostLoginPath(user.role);
  if (path === "/") void import("@/pages/home");
  else if (path === "/advisor") void import("@/pages/advisor-dashboard");
  else if (path === "/admin/dashboard") void import("@/pages/admin-dashboard");
  else if (path === "/admin/plans") void import("@/pages/admin-plans");
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const cachedUser = useMemo(() => readAuthCache(), []);

  const { data, isLoading, isFetched } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!isFetched) return;
    const user = data?.user ?? null;
    writeAuthCache(user);
    if (user) prefetchAfterAuth(queryClient, user);
  }, [data, isFetched, queryClient]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return response.json();
    },
    onSuccess: (data: LoginResult) => {
      if ("user" in data) {
        queryClient.setQueryData(["/api/auth/me"], data);
        writeAuthCache(data.user);
        prefetchAfterAuth(queryClient, data.user);
      }
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async ({ tempToken, code }: { tempToken: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/2fa/verify", { tempToken, code });
      return response.json();
    },
    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      writeAuthCache(data.user);
      prefetchAfterAuth(queryClient, data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      writeAuthCache(null);
    },
  });

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const data = (await loginMutation.mutateAsync({ username, password })) as LoginResult;
    if ("user" in data) {
      queryClient.setQueryData(["/api/auth/me"], data);
    }
    return data;
  };

  const verify2FA = async (tempToken: string, code: string) => {
    const data = await verify2FAMutation.mutateAsync({ tempToken, code });
    queryClient.setQueryData(["/api/auth/me"], data);
  };

  const resend2FA = async (tempToken: string, loginIdentifier?: string) => {
    const response = await apiRequest("POST", "/api/auth/2fa/resend", { tempToken, loginIdentifier });
    return response.json() as Promise<{ tempToken: string; emailMasked?: string; message?: string; devCode?: string }>;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; avatarUrl?: string | null }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", updates);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      if (data?.user) writeAuthCache(data.user);
    },
  });

  const updateProfile = async (updates: { name?: string; avatarUrl?: string | null }) => {
    await updateProfileMutation.mutateAsync(updates);
  };

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? (!isFetched ? cachedUser : null),
        isLoading: isLoading && !cachedUser && !data?.user,
        login,
        verify2FA,
        resend2FA,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
