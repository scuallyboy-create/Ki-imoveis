import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, ADMIN_MANAGEMENT_PERMISSIONS, PLAN_CATALOG } from '../constants';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: any): boolean => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === 'undefined' || trimmed === 'null') return false;
  if (trimmed.toLowerCase().includes('placeholder')) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isSecretKey = (k: any): boolean => {
  if (typeof k !== 'string') return false;
  const lower = k.trim().toLowerCase();
  return lower.startsWith('sb_secret_') || lower.includes('service_role') || lower.includes('secret');
};

const isPublishableKey = (k: any): boolean => {
  if (typeof k !== 'string') return false;
  const trimmed = k.trim();
  if (isSecretKey(trimmed)) return false;
  return trimmed.startsWith('sb_publishable_') || trimmed.startsWith('eyJ');
};

const DEFAULT_SUPABASE_URL = 'https://ruewingpnfbgqdvwpklp.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_qQTWgxBLqsQaOB6chNmUJQ__m4eDW8a';

const hasMatchedEnvPair = isValidUrl(rawUrl) && isPublishableKey(rawKey);
const finalUrl = hasMatchedEnvPair ? (rawUrl as string).trim() : DEFAULT_SUPABASE_URL;
const finalKey = hasMatchedEnvPair ? (rawKey as string).trim() : DEFAULT_SUPABASE_KEY;

// Seed local database tables if not present
export function ensureSeededLocalDb() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('offline_db_profiles')) {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'offline_db_profiles',
      JSON.stringify([
        {
          id: '7d7f0f6a-65ff-4b00-8fb3-e0bc5de09afb',
          email: ADMIN_EMAIL,
          displayName: 'Administrador Ki-Imóveis',
          role: 'admin',
          subscriptionPlan: 'gold',
          licenseStatus: 'active',
          licenseNumber: 'KI-ADM-0001',
          licenseExpiresAt: now + oneYear,
          verified: true,
          permissions: ADMIN_MANAGEMENT_PERMISSIONS,
          phoneNumber: '+244 923 100 001',
          address: 'Luanda, Talatona',
          favorites: [],
          createdAt: now - oneMonth,
        },
        {
          id: 'a1',
          email: 'angoreal@kiimoveis.ao',
          displayName: 'AngoReal Imobiliária',
          role: 'agency_admin',
          subscriptionPlan: 'gold',
          licenseStatus: 'active',
          licenseNumber: 'KI-AG-2026-014',
          licenseExpiresAt: now + oneYear,
          verified: true,
          permissions: PLAN_CATALOG.gold.defaultPermissions,
          phoneNumber: '+244 923 450 100',
          address: 'Luanda, Miramar',
          favorites: [],
          createdAt: now - oneMonth * 3,
        },
        {
          id: 'a2',
          email: 'francisco.costa@kiimoveis.ao',
          displayName: 'Francisco Costa',
          role: 'agent',
          subscriptionPlan: 'silver',
          licenseStatus: 'active',
          licenseNumber: 'KI-COR-2026-089',
          licenseExpiresAt: now + oneMonth * 6,
          verified: true,
          permissions: PLAN_CATALOG.silver.defaultPermissions,
          phoneNumber: '+244 923 000 000',
          address: 'Luanda & Benguela',
          favorites: [],
          createdAt: now - oneMonth * 2,
        },
        {
          id: 'a3',
          email: 'elitehomes@kiimoveis.ao',
          displayName: 'Elite Homes Luanda',
          role: 'agency_admin',
          subscriptionPlan: 'gold',
          licenseStatus: 'active',
          licenseNumber: 'KI-AG-2026-032',
          licenseExpiresAt: now + oneYear,
          verified: true,
          permissions: PLAN_CATALOG.gold.defaultPermissions,
          phoneNumber: '+244 924 880 220',
          address: 'Luanda, Talatona',
          favorites: [],
          createdAt: now - oneMonth * 4,
        },
        {
          id: 'a4',
          email: 'maria.santos@kiimoveis.ao',
          displayName: 'Maria Santos',
          role: 'agent',
          subscriptionPlan: 'free',
          licenseStatus: 'pending',
          licenseNumber: 'KI-COR-2026-144',
          packageRequested: 'silver',
          verified: false,
          permissions: PLAN_CATALOG.free.defaultPermissions,
          phoneNumber: '+244 931 210 340',
          address: 'Huíla, Lubango',
          favorites: [],
          createdAt: now - oneMonth,
        },
        {
          id: '81778693-3185-458f-8027-bee0b24c15a2',
          email: 'puzumak17@gmail.com',
          displayName: 'Pedro Silva',
          role: 'user',
          subscriptionPlan: 'free',
          licenseStatus: 'active',
          packageRequested: 'silver',
          verified: false,
          permissions: {
            canPublishListings: false,
            maxListings: 0,
            canFeatureListings: false,
            canAccessLeads: false,
            verifiedBadge: false,
          },
          phoneNumber: '+244 922 555 019',
          address: 'Luanda, Kilamba',
          favorites: [],
          createdAt: now - 1000 * 60 * 60 * 24 * 5,
        },
      ])
    );
  }

  if (!localStorage.getItem('offline_db_property_requests')) {
    localStorage.setItem(
      'offline_db_property_requests',
      JSON.stringify([
        {
          id: 'req-1',
          ownerId: '81778693-3185-458f-8027-bee0b24c15a2',
          ownerName: 'Pedro Silva',
          ownerEmail: 'puzumak17@gmail.com',
          ownerPhone: '+244 922 555 019',
          propertyTitle: 'Apartamento T3 em Talatona',
          propertyDescription: 'Procuro vender um apartamento T3 mobilado em condomínio fechado.',
          location: 'Luanda',
          address: 'Talatona, Via AL1',
          propertyType: 'apartment',
          assignedAgentId: 'a2',
          notificationMethod: 'email',
          status: 'pending',
          createdAt: Date.now() - 86400000 * 2,
        },
      ])
    );
  }

  if (!localStorage.getItem('offline_db_partner_applications')) {
    localStorage.setItem(
      'offline_db_partner_applications',
      JSON.stringify([
        {
          id: 'app-1',
          userId: 'a4',
          userEmail: 'maria.santos@kiimoveis.ao',
          fullName: 'Maria Santos',
          type: 'individual',
          nif: '5004128930',
          licenseNumber: 'KI-COR-2026-144',
          documentUrl: 'carteira_profissional_maria.pdf',
          documents: ['carteira_profissional_maria.pdf'],
          status: 'pending',
          appliedAt: Date.now() - 86400000 * 3,
        },
      ])
    );
  }
  // Ensure existing seeded admin profile always enforces management-only permissions
  try {
    const existingProfiles = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
    if (Array.isArray(existingProfiles)) {
      let changed = false;
      const repaired = existingProfiles.map((p: any) => {
        if (p?.email?.toLowerCase() === ADMIN_EMAIL && p?.permissions?.canPublishListings !== false) {
          changed = true;
          return {
            ...p,
            role: 'admin',
            permissions: ADMIN_MANAGEMENT_PERMISSIONS,
          };
        }
        return p;
      });
      if (changed) {
        localStorage.setItem('offline_db_profiles', JSON.stringify(repaired));
      }
    }
  } catch {
    // Safe ignore
  }
}

ensureSeededLocalDb();

export function clearAllBrowserAuthSessions() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('offline_session');
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sb-') && k.includes('auth-token')) {
      localStorage.removeItem(k);
    }
  }
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(unescape(encodeURIComponent(input)));
}

export async function saveLocalCredential(email: string, password: string): Promise<void> {
  if (typeof window === 'undefined' || !email || !password) return;
  const emailLower = email.trim().toLowerCase();
  const saltBytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(saltBytes);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await sha256Hex(`${salt}:${password}`);
  const store = JSON.parse(localStorage.getItem('offline_db_credentials') || '{}');
  store[emailLower] = `${salt}:${hash}`;
  localStorage.setItem('offline_db_credentials', JSON.stringify(store));
}

export async function verifyLocalCredential(email: string, password: string): Promise<'ok' | 'mismatch' | 'missing'> {
  if (typeof window === 'undefined' || !email || !password) return 'missing';
  const emailLower = email.trim().toLowerCase();
  const store = JSON.parse(localStorage.getItem('offline_db_credentials') || '{}');
  const record = store[emailLower];
  if (!record || typeof record !== 'string' || !record.includes(':')) return 'missing';
  const [salt, expectedHash] = record.split(':');
  const actualHash = await sha256Hex(`${salt}:${password}`);
  return actualHash === expectedHash ? 'ok' : 'mismatch';
}

export function buildLocalSessionForProfile(profile: any) {
  const isAdmin = profile.email?.toLowerCase() === ADMIN_EMAIL;
  const session = {
    access_token: 'local-access-token-' + Date.now(),
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'local-refresh-token-' + Date.now(),
    user: {
      id: profile.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: profile.email,
      email_confirmed_at: new Date().toISOString(),
      phone: profile.phoneNumber || '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        display_name: profile.displayName || profile.email.split('@')[0],
        role: isAdmin ? 'admin' : profile.role || 'user',
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('offline_session', JSON.stringify(session));
  }
  return session;
}

const handleLocalFallback = async (urlStr: string, init?: RequestInit): Promise<Response> => {
  const url = new URL(urlStr);
  const path = url.pathname;
  const method = init?.method?.toUpperCase() || 'GET';
  const bodyStr = init?.body ? String(init.body) : '';

  let bodyData: any = {};
  if (bodyStr) {
    try {
      bodyData = JSON.parse(bodyStr);
    } catch {
      // Safe to ignore
    }
  }

  // --- AUTH FLOWS ---
  if (path.includes('/auth/v1/token')) {
    const grantType = url.searchParams.get('grant_type');
    if (grantType === 'refresh_token') {
      const saved = localStorage.getItem('offline_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'invalid_grant', message: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = typeof bodyData.email === 'string' ? bodyData.email.trim() : '';
    const password = typeof bodyData.password === 'string' ? bodyData.password : '';
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Invalid login credentials' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const localProfiles = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
    const deletedRaw = JSON.parse(localStorage.getItem('ki_imoveis_deleted_agents_v1') || '{}');
    const deletedEmails: string[] = Array.isArray(deletedRaw?.emails)
      ? deletedRaw.emails.map((e: string) => e.toLowerCase())
      : [];

    if (deletedEmails.includes(email.toLowerCase())) {
      return new Response(
        JSON.stringify({ message: 'Esta conta foi eliminada pela administração Ki-Imóveis.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const existing = localProfiles.find(
      (p: any) => p.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      return new Response(JSON.stringify({ message: 'Invalid login credentials' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existing.licenseStatus === 'blocked') {
      return new Response(
        JSON.stringify({ message: 'Esta conta foi bloqueada pela administração Ki-Imóveis.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const credCheck = await verifyLocalCredential(email, password);
    if (credCheck === 'mismatch') {
      return new Response(JSON.stringify({ message: 'Invalid login credentials' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = buildLocalSessionForProfile(existing);
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/auth/v1/signup')) {
    const email = typeof bodyData.email === 'string' ? bodyData.email.trim() : '';
    const password = typeof bodyData.password === 'string' ? bodyData.password : '';
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'E-mail e palavra-passe obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (email.toLowerCase() === ADMIN_EMAIL) {
      return new Response(JSON.stringify({ message: 'Esta conta é reservada à administração.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const localProfiles = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
    if (localProfiles.some((p: any) => p.email?.toLowerCase() === email.toLowerCase())) {
      return new Response(JSON.stringify({ message: 'User already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const displayName =
      bodyData.options?.data?.display_name ||
      bodyData.data?.display_name ||
      email.split('@')[0];
    const requestedRole = bodyData.options?.data?.role || bodyData.data?.role || 'user';
    const role = requestedRole === 'agent' || requestedRole === 'agency_admin' ? requestedRole : 'user';
    const plan = bodyData.options?.data?.subscriptionPlan || bodyData.data?.subscriptionPlan || 'free';
    const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    const newProfile = {
      id: userId,
      email,
      displayName,
      role,
      subscriptionPlan: 'free',
      packageRequested: plan !== 'free' ? plan : null,
      licenseStatus: plan !== 'free' ? 'pending' : 'active',
      verified: false,
      permissions: PLAN_CATALOG.free.defaultPermissions,
      favorites: [],
      createdAt: Date.now(),
    };
    localProfiles.push(newProfile);
    localStorage.setItem('offline_db_profiles', JSON.stringify(localProfiles));
    await saveLocalCredential(email, password);

    clearAllBrowserAuthSessions();
    const session = buildLocalSessionForProfile(newProfile);
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/auth/v1/user') || path.includes('/auth/v1/session')) {
    const savedSession = localStorage.getItem('offline_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      return new Response(JSON.stringify(parsed.user || parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/auth/v1/logout')) {
    clearAllBrowserAuthSessions();
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- DATABASE API ENDPOINTS (/rest/v1/) ---
  if (path.includes('/rest/v1/')) {
    const tableNameMatch = path.match(/\/rest\/v1\/([^/?]+)/);
    const tableName = tableNameMatch ? tableNameMatch[1] : '';

    if (tableName) {
      const storageKey = `offline_db_${tableName}`;
      let localData: any[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

      if (method === 'GET') {
        for (const [key, val] of url.searchParams.entries()) {
          if (val.startsWith('eq.')) {
            const expectedValue = val.slice(3);
            localData = localData.filter((item: any) => {
              const itemVal = item[key];
              if (itemVal === undefined || itemVal === null) return false;
              return String(itemVal) === expectedValue;
            });
          }
        }

        const acceptHeader =
          (init?.headers instanceof Headers
            ? init.headers.get('Accept')
            : (init?.headers as any)?.Accept || (init?.headers as any)?.accept) || '';
        const hSingle = acceptHeader.includes('application/vnd.pgrst.object+json');
        if (hSingle) {
          return new Response(JSON.stringify(localData[0] || null), {
            status: localData[0] ? 200 : 406,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-0/0',
            },
          });
        }

        return new Response(JSON.stringify(localData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': `0-${Math.max(0, localData.length - 1)}/${localData.length}`,
          },
        });
      }

      if (method === 'POST') {
        const rowsToInsert = Array.isArray(bodyData) ? bodyData : [bodyData];
        const newRows = rowsToInsert.map((row: any) => ({
          id: row.id || 'item-' + Math.random().toString(36).substring(2, 9),
          ...row,
          createdAt: row.createdAt || Date.now(),
        }));

        // Avoid duplicate IDs for profiles
        const filteredExisting = localData.filter(
          (existing) => !newRows.some((nr) => nr.id && existing.id === nr.id)
        );
        const updatedData = [...filteredExisting, ...newRows];
        localStorage.setItem(storageKey, JSON.stringify(updatedData));

        return new Response(JSON.stringify(newRows), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'PATCH' || method === 'PUT') {
        let filterKey = '';
        let filterVal = '';
        for (const [key, val] of url.searchParams.entries()) {
          if (val.startsWith('eq.')) {
            filterKey = key;
            filterVal = val.slice(3);
            break;
          }
        }

        const updatedRows: any[] = [];
        const updatedData = localData.map((item: any) => {
          if (!filterKey || String(item[filterKey]) === filterVal) {
            const next = { ...item, ...bodyData, updatedAt: Date.now() };
            updatedRows.push(next);
            return next;
          }
          return item;
        });

        localStorage.setItem(storageKey, JSON.stringify(updatedData));
        return new Response(JSON.stringify(updatedRows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'DELETE') {
        let filterKey = '';
        let filterVal = '';
        for (const [key, val] of url.searchParams.entries()) {
          if (val.startsWith('eq.')) {
            filterKey = key;
            filterVal = val.slice(3);
            break;
          }
        }

        const filteredData = localData.filter((item: any) => {
          if (!filterKey) return false;
          return String(item[filterKey]) !== filterVal;
        });

        localStorage.setItem(storageKey, JSON.stringify(filteredData));
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

  const isRestCall = urlStr.includes('/rest/v1/');

  // Always prefer local structured storage for Ki-Imóveis REST tables so schema mismatches
  // in shared Supabase projects never leak or fail silently
  if (isRestCall) {
    return handleLocalFallback(urlStr, init);
  }

  const headers = new Headers(
    init?.headers || (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined)
  );
  const reqApiKey = headers.get('apikey');
  if (reqApiKey && isSecretKey(reqApiKey)) {
    headers.set('apikey', finalKey);
  }
  const reqAuth = headers.get('authorization') || headers.get('Authorization');
  if (reqAuth && isSecretKey(reqAuth.replace(/^Bearer\s+/i, ''))) {
    headers.set('Authorization', `Bearer ${finalKey}`);
  }

  const modifiedInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(input, modifiedInit);
    if (response.status >= 500) {
      throw new Error(`Server returned error status: ${response.status}`);
    }
    if (
      response.status === 429 &&
      (urlStr.includes('/auth/v1/signup') || urlStr.includes('/auth/v1/recover'))
    ) {
      throw new Error('Supabase auth email rate limit reached.');
    }
    if (response.status === 401 || response.status === 403) {
      const cloned = response.clone();
      try {
        const data = await cloned.json();
        const errText = `${data?.message || ''} ${data?.msg || ''} ${data?.hint || ''}`;
        if (
          errText.includes('Forbidden use of secret API key') ||
          errText.includes('Secret API keys can only be used') ||
          errText.includes('Invalid API key') ||
          data?.sb_error_code === 'UNAUTHORIZED_INVALID_API_KEY_TYPE'
        ) {
          throw new Error('Supabase rejected API key.');
        }
      } catch (parseErr: any) {
        if (parseErr.message?.includes('Supabase rejected API key')) {
          throw parseErr;
        }
      }
    }
    return response;
  } catch (err) {
    console.warn('Supabase network/gateway fallback activated:', err);
    return handleLocalFallback(urlStr, modifiedInit);
  }
};

export const supabase = createClient(finalUrl, finalKey, {
  global: {
    fetch: customFetch,
  },
});
