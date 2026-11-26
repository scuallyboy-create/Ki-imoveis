import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { SubscriptionPlan, UserProfile } from '../types';
import {
  buildLocalSessionForProfile,
  clearAllBrowserAuthSessions,
  ensureSeededLocalDb,
  saveLocalCredential,
  supabase,
  verifyLocalCredential,
} from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { ADMIN_EMAIL, ADMIN_MANAGEMENT_PERMISSIONS } from '../constants';
import {
  DATA_UPDATED_EVENT,
  emitDataUpdate,
  getDefaultPermissionsForPlan,
  isAccountDeleted,
} from '../lib/dataService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: string,
    metadata?: any
  ) => Promise<{ autoSignedIn: boolean }>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  toggleFavorite: (propertyId: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readLocalProfiles(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  } catch {
    return [];
  }
}

function writeLocalProfiles(profiles: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('offline_db_profiles', JSON.stringify(profiles));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = useCallback((uid: string, sbUser: User, profile?: any): UserProfile => {
    const metadata = sbUser.user_metadata || {};
    const sbEmail = (sbUser.email || '').trim();
    const profileEmail = (profile?.email || '').trim();

    // Only trust a passed profile if it matches the authenticated user's email
    const safeProfile =
      profile && (!sbEmail || !profileEmail || profileEmail.toLowerCase() === sbEmail.toLowerCase())
        ? profile
        : undefined;

    const email = sbEmail || profileEmail;
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL;

    const resolvedName =
      safeProfile?.displayName ||
      safeProfile?.display_name ||
      safeProfile?.full_name ||
      metadata.display_name ||
      metadata.full_name ||
      email.split('@')[0] ||
      'Utilizador';

    const plan: SubscriptionPlan = isAdmin
      ? 'gold'
      : safeProfile?.subscriptionPlan || metadata.subscriptionPlan || 'free';

    const resolvedRole = isAdmin
      ? 'admin'
      : safeProfile?.role && safeProfile.role !== 'admin'
      ? safeProfile.role
      : metadata.role && metadata.role !== 'admin'
      ? metadata.role
      : 'user';

    return {
      ...(safeProfile || {}),
      uid: safeProfile?.id || uid,
      id: safeProfile?.id || uid,
      email,
      displayName: resolvedName,
      role: resolvedRole,
      favorites: Array.isArray(safeProfile?.favorites) ? safeProfile.favorites : [],
      subscriptionPlan: plan,
      licenseStatus: isAdmin ? 'active' : safeProfile?.licenseStatus || 'active',
      licenseNumber: isAdmin ? safeProfile?.licenseNumber || 'KI-ADM-0001' : safeProfile?.licenseNumber,
      verified: isAdmin ? true : Boolean(safeProfile?.verified),
      permissions: isAdmin
        ? ADMIN_MANAGEMENT_PERMISSIONS
        : safeProfile?.permissions || getDefaultPermissionsForPlan(plan),
    } as UserProfile;
  }, []);

  const syncLocalProfile = useCallback(
    (uid: string, sbUser: User): UserProfile => {
      const profiles = readLocalProfiles();
      const emailLower = (sbUser.email || '').trim().toLowerCase();

      // Match primarily by exact email, or by id ONLY if email also matches
      let match = profiles.find((p) => {
        const pEmail = (p.email || '').trim().toLowerCase();
        if (emailLower && pEmail) return pEmail === emailLower;
        return p.id === uid;
      });

      if (!match) {
        const normalized = normalizeUser(uid, sbUser);
        const toStore = { ...normalized, id: uid, createdAt: Date.now() };
        writeLocalProfiles([...profiles, toStore]);
        return normalized;
      }

      const normalized = normalizeUser(match.id || uid, sbUser, match);
      const updatedProfiles = profiles.map((p) =>
        p === match ? { ...p, ...normalized, id: match.id || uid } : p
      );
      writeLocalProfiles(updatedProfiles);
      return normalized;
    },
    [normalizeUser]
  );

  const fetchProfile = useCallback(
    async (uid: string, sbUser: User) => {
      const sbEmailLower = (sbUser.email || '').trim().toLowerCase();
      if (isAccountDeleted(uid, sbEmailLower)) {
        clearAllBrowserAuthSessions();
        setUser(null);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single();

        const profEmailLower = (profile?.email || '').trim().toLowerCase();

        if (profile && (!sbEmailLower || !profEmailLower || profEmailLower === sbEmailLower)) {
          if (profile.licenseStatus === 'blocked' && sbEmailLower !== ADMIN_EMAIL) {
            clearAllBrowserAuthSessions();
            setUser(null);
            return;
          }
          setUser(normalizeUser(uid, sbUser, profile));
        } else {
          const synced = syncLocalProfile(uid, sbUser);
          if (synced.licenseStatus === 'blocked' && sbEmailLower !== ADMIN_EMAIL) {
            clearAllBrowserAuthSessions();
            setUser(null);
            return;
          }
          setUser(synced);
        }
      } catch {
        const synced = syncLocalProfile(uid, sbUser);
        if (synced.licenseStatus === 'blocked' && sbEmailLower !== ADMIN_EMAIL) {
          clearAllBrowserAuthSessions();
          setUser(null);
          return;
        }
        setUser(synced);
      }
    },
    [normalizeUser, syncLocalProfile]
  );

  const refreshProfile = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const prevEmailLower = (prev.email || '').trim().toLowerCase();
      if (isAccountDeleted(prev.uid, prevEmailLower)) {
        clearAllBrowserAuthSessions();
        return null;
      }
      const profiles = readLocalProfiles();
      const match = profiles.find((p) => {
        const pEmail = (p.email || '').trim().toLowerCase();
        if (prevEmailLower && pEmail) return pEmail === prevEmailLower;
        return p.id === prev.uid;
      });
      if (!match) return prev;
      if (match.licenseStatus === 'blocked' && prevEmailLower !== ADMIN_EMAIL) {
        clearAllBrowserAuthSessions();
        return null;
      }
      const isAdmin = prevEmailLower === ADMIN_EMAIL;
      return {
        ...prev,
        ...match,
        uid: match.id || prev.uid,
        role: isAdmin ? 'admin' : match.role === 'admin' ? 'user' : match.role || prev.role,
        permissions: isAdmin ? ADMIN_MANAGEMENT_PERMISSIONS : match.permissions || prev.permissions,
        favorites: Array.isArray(match.favorites) ? match.favorites : prev.favorites || [],
      };
    });
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('offline_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.user?.email) {
              await fetchProfile(parsed.user.id, parsed.user);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      }
      setLoading(false);
    });

    window.addEventListener(DATA_UPDATED_EVENT, refreshProfile);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener(DATA_UPDATED_EVENT, refreshProfile);
    };
  }, [fetchProfile, refreshProfile]);

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const cleanEmailLower = cleanEmail.toLowerCase();

    if (isAccountDeleted(undefined, cleanEmailLower)) {
      throw new Error('Esta conta foi eliminada pela administração Ki-Imóveis.');
    }

    const preProfiles = readLocalProfiles();
    const preMatch = preProfiles.find((p) => p.email?.toLowerCase() === cleanEmailLower);
    if (preMatch?.licenseStatus === 'blocked' && cleanEmailLower !== ADMIN_EMAIL) {
      throw new Error('Esta conta foi bloqueada pela administração Ki-Imóveis.');
    }

    clearAllBrowserAuthSessions();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      ensureSeededLocalDb();
      // Handle local preview login for accounts created when Supabase requires email confirmation
      const profiles = readLocalProfiles();
      const matchedProfile = profiles.find(
        (p) => p.email?.toLowerCase() === cleanEmailLower
      );
      if (
        matchedProfile &&
        (error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('invalid login credentials'))
      ) {
        if (matchedProfile.licenseStatus === 'blocked' && cleanEmailLower !== ADMIN_EMAIL) {
          throw new Error('Esta conta foi bloqueada pela administração Ki-Imóveis.');
        }
        const check = await verifyLocalCredential(cleanEmail, password);
        if (check === 'ok') {
          const localSession = buildLocalSessionForProfile(matchedProfile);
          setUser(normalizeUser(matchedProfile.id, localSession.user as unknown as User, matchedProfile));
          emitDataUpdate();
          return;
        }
      }
      throw error;
    }

    if (data.user) {
      await fetchProfile(data.user.id, data.user);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: string,
    metadata: any = {}
  ): Promise<{ autoSignedIn: boolean }> => {
    const cleanEmail = email.trim();
    const cleanEmailLower = cleanEmail.toLowerCase();
    if (cleanEmailLower === ADMIN_EMAIL) {
      throw new Error('Esta conta é reservada exclusivamente à administração.');
    }
    if (isAccountDeleted(undefined, cleanEmailLower)) {
      throw new Error('Esta conta foi eliminada pela administração Ki-Imóveis.');
    }
    const existingLocal = readLocalProfiles().find(
      (p) => p.email?.toLowerCase() === cleanEmailLower
    );
    if (existingLocal) {
      throw new Error('User already registered');
    }

    // Crucial: Clear any active session (e.g. scuallyboy@gmail.com) BEFORE creating the new account
    clearAllBrowserAuthSessions();
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Safe ignore
    }

    const requestedPlan: SubscriptionPlan =
      metadata.subscriptionPlan && ['free', 'silver', 'gold'].includes(metadata.subscriptionPlan)
        ? metadata.subscriptionPlan
        : 'free';

    const safeRole = role === 'agent' || role === 'agency_admin' ? role : 'user';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          role: safeRole,
          subscriptionPlan: requestedPlan,
        },
      },
    });

    const isRateLimited =
      Boolean(authError) &&
      ((authError as any)?.status === 429 ||
        authError?.message?.toLowerCase().includes('rate limit'));

    if (authError && !isRateLimited) throw authError;

    const uid =
      (!isRateLimited ? authData.user?.id : undefined) ||
      'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const newProfile = {
      id: uid,
      email: cleanEmail,
      displayName: displayName.trim(),
      role: safeRole,
      favorites: [],
      subscriptionPlan: 'free' as SubscriptionPlan,
      packageRequested: requestedPlan !== 'free' ? requestedPlan : null,
      licenseStatus: requestedPlan !== 'free' ? ('pending' as const) : ('active' as const),
      verified: false,
      permissions: getDefaultPermissionsForPlan('free'),
      createdAt: Date.now(),
    };

    await saveLocalCredential(cleanEmail, password);

    const profiles = readLocalProfiles().filter(
      (p) => p.email?.toLowerCase() !== cleanEmail.toLowerCase() && p.id !== uid
    );
    writeLocalProfiles([...profiles, newProfile]);

    try {
      await supabase.from('profiles').insert(newProfile);
    } catch {
      // Local persistence already updated
    }

    // Establish active session strictly for the newly created account (never the old user)
    if (!isRateLimited && authData.session && authData.user) {
      setUser(normalizeUser(uid, authData.user, newProfile));
    } else {
      const localSession = buildLocalSessionForProfile(newProfile);
      setUser(normalizeUser(uid, localSession.user as unknown as User, newProfile));
    }

    emitDataUpdate();
    return { autoSignedIn: true };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Safe ignore
    }
    clearAllBrowserAuthSessions();
    setUser(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
    const safeUpdates: Partial<UserProfile> = isAdmin
      ? { ...updates, role: 'admin', permissions: ADMIN_MANAGEMENT_PERMISSIONS }
      : { ...updates, role: updates.role === 'admin' ? user.role : updates.role };

    const profiles = readLocalProfiles();
    const emailLower = (user.email || '').trim().toLowerCase();
    let found = false;
    const nextProfiles = profiles.map((p) => {
      const pEmail = (p.email || '').trim().toLowerCase();
      if ((emailLower && pEmail === emailLower) || (!emailLower && p.id === user.uid)) {
        found = true;
        return { ...p, ...safeUpdates, updatedAt: Date.now() };
      }
      return p;
    });
    if (!found) {
      nextProfiles.push({ ...user, ...safeUpdates, id: user.uid, updatedAt: Date.now() });
    }
    writeLocalProfiles(nextProfiles);

    try {
      await supabase.from('profiles').update(safeUpdates).eq('id', user.uid);
    } catch {
      // Local persistence already updated
    }

    setUser((prev) => (prev ? { ...prev, ...safeUpdates } : null));
    emitDataUpdate();
  };

  const toggleFavorite = async (propertyId: string): Promise<boolean> => {
    if (!user) return false;
    const current = Array.isArray(user.favorites) ? user.favorites : [];
    const exists = current.includes(propertyId);
    const next = exists ? current.filter((id) => id !== propertyId) : [...current, propertyId];
    await updateUserProfile({ favorites: next });
    return !exists;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateUserProfile,
        toggleFavorite,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
