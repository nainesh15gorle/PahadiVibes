"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";

// Initialize the client-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  profile_image?: string;
  phone?: string;
  provider: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  signUp: (params: any) => Promise<any>;
  signIn: (params: any) => Promise<any>;
  signInWithGoogle: (redirectUrl?: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile from public.users table
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch public profile:", error);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error("Profile fetch error:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      if (prof) setProfile(prof);
    }
  };

  // Helper to manage access cookie for Server / Middleware auth
  const setCookie = (accessToken: string | null) => {
    if (accessToken) {
      // Set access token cookie for 7 days
      document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
    } else {
      // Delete access token cookie
      document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setCookie(session.access_token);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
        setCookie(null);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          setCookie(session.access_token);
          
          // Fetch or create profile (double insurance fallback if trigger is not configured or slow)
          let prof = await fetchProfile(session.user.id);
          if (!prof) {
            // Profile doesn't exist yet, insert it from metadata
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Patron";
            const profileImg = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
            const providerName = session.user.app_metadata?.provider || "email";
            
            const newProfile = {
              id: session.user.id,
              full_name: name,
              email: session.user.email || "",
              profile_image: profileImg || null,
              phone: session.user.phone || null,
              provider: providerName,
            };

            const { data: insertedData } = await supabase
              .from("users")
              .upsert(newProfile)
              .select()
              .maybeSingle();

            if (insertedData) {
              prof = insertedData as UserProfile;
            }
          }
          setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
          setCookie(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Email and Password Registration
  const handleSignUp = async ({ email, password, fullName }: any) => {
    setIsLoading(true);
    try {
      // Direct call to public API signup route. We use an API endpoint to bypass email confirmation / SMTP dependency.
      // This is extremely safe and reliable for dev/staging, and inserts user directly.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to register.");
      }

      // Automatically sign in the user on the client after successful signup
      const loginResult = await handleSignIn({ email, password });
      return loginResult;
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  // Email and Password Login
  const handleSignIn = async ({ email, password }: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  // Google OAuth Authentication
  const handleSignInWithGoogle = async (redirectPath?: string) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const path = redirectPath || "/";
      const redirectUrl = `${origin}/sso-callback?redirect_url=${encodeURIComponent(path)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  // Logout
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setCookie(null);
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    isLoading,
    isLoaded: !isLoading,
    isSignedIn: !!user,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
