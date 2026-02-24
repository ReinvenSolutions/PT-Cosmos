import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
}

export type LoginResult =
  | { user: User }
  | { needs2FA: true; tempToken: string; message?: string };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return response.json();
    },
    onSuccess: async (data: LoginResult) => {
      if ("user" in data) {
        queryClient.setQueryData(["/api/auth/me"], data);
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async ({ tempToken, code }: { tempToken: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/2fa/verify", { tempToken, code });
      return response.json();
    },
    onSuccess: async (data: { user: User }) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const data = await loginMutation.mutateAsync({ username, password });
    return data as LoginResult;
  };

  const verify2FA = async (tempToken: string, code: string) => {
    await verify2FAMutation.mutateAsync({ tempToken, code });
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
    },
  });

  const updateProfile = async (updates: { name?: string; avatarUrl?: string | null }) => {
    await updateProfileMutation.mutateAsync(updates);
  };

  return (
    <AuthContext.Provider
      value={{
        user: data?.user || null,
        isLoading,
        login,
        verify2FA,
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
