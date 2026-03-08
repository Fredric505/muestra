import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface WorkshopInfo {
  id: string;
  name: string;
  subscription_status: string;
  is_active: boolean;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  plan_id: string | null;
  phone: string | null;
  address: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  currency: string;
  pause_type: string | null;
  pause_reason: string | null;
  pause_estimated_resume: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  employeeType: "technician" | "seller" | null;
  profile: { id: string; full_name: string; avatar_url: string | null } | null;
  workshop: WorkshopInfo | null;
  workshopId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profile, setProfile] = useState<{ id: string; full_name: string; avatar_url: string | null } | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(null);
  const [employeeType, setEmployeeType] = useState<"technician" | "seller" | null>(null);

  const isLoading = initialLoading || (!!user && !isUserDataLoaded);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, workshop_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = roleData?.map((r) => r.role) || [];
      setIsAdmin(roles.includes("admin"));
      setIsSuperAdmin(roles.includes("super_admin"));

      // Fetch employee type if not admin
      if (!roles.includes("admin") && !roles.includes("super_admin")) {
        const { data: empData } = await supabase
          .from("employees")
          .select("employee_type")
          .eq("user_id", userId)
          .maybeSingle();
        setEmployeeType(empData?.employee_type as "technician" | "seller" | null);
      } else {
        setEmployeeType(null);
      }

      if (profileData?.workshop_id) {
        const { data: wsData } = await supabase
          .from("workshops")
          .select("id, name, subscription_status, is_active, trial_ends_at, subscription_ends_at, plan_id, phone, address, whatsapp, email, logo_url, currency, pause_type, pause_reason, pause_estimated_resume")
          .eq("id", profileData.workshop_id)
          .maybeSingle();
        if (wsData) {
          setWorkshop({ ...wsData, currency: wsData.currency || "USD" } as WorkshopInfo);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsUserDataLoaded(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setIsUserDataLoaded(false);
          setTimeout(() => {
            if (isMounted) fetchUserData(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setWorkshop(null);
          setEmployeeType(null);
          setIsUserDataLoaded(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWorkshop(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setEmployeeType(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAdmin, isSuperAdmin, employeeType, profile, workshop, workshopId: workshop?.id || null, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};