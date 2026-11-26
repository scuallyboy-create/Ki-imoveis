import {
  AgentDirectoryItem,
  AgentEvaluation,
  AvailabilityStatus,
  PlanCatalogItem,
  Property,
  SubscriptionPlan,
  UserPermissions,
  UserProfile,
  VisitRequest,
} from '../types';
import {
  ADMIN_EMAIL,
  ADMIN_MANAGEMENT_PERMISSIONS,
  ANGOLA_LOCATIONS,
  PLAN_CATALOG,
} from '../constants';
import { ASSETS } from './assets';
import { ensureSeededLocalDb } from './supabase';
import { dispatchNotification } from './notificationService';

const PROPERTIES_KEY = 'ki_imoveis_properties_v1';
const VISITS_KEY = 'ki_imoveis_visits_v1';
const EVALUATIONS_KEY = 'ki_imoveis_agent_evaluations_v1';
const PLAN_CATALOG_KEY = 'ki_imoveis_plan_catalog_v1';
const DELETED_AGENTS_KEY = 'ki_imoveis_deleted_agents_v1';
const VISIT_TOS_KEY = 'ki_imoveis_visit_tos_v1';
export const DATA_UPDATED_EVENT = 'ki-data-updated';

export function hasAcceptedVisitTerms(userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(VISIT_TOS_KEY);
    if (!raw) return false;
    const store = JSON.parse(raw);
    const key = userId ? String(userId) : 'guest';
    return Boolean(store?.[key]?.accepted);
  } catch {
    return false;
  }
}

export function acceptVisitTerms(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(VISIT_TOS_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const record = { accepted: true, acceptedAt: Date.now(), version: '1.0' };
    if (userId) {
      store[String(userId)] = record;
    } else {
      store.guest = record;
    }
    localStorage.setItem(VISIT_TOS_KEY, JSON.stringify(store));
  } catch {
    // Safe ignore
  }
}

export function emitDataUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
  }
}

export const DEFAULT_AGENTS: AgentDirectoryItem[] = [
  {
    id: 'a1',
    name: 'AngoReal Imobiliária',
    type: 'agency',
    location: 'Luanda',
    rating: 4.9,
    reviews: 64,
    verified: true,
    experience: '12 anos',
    specialties: ['Apartamentos em Talatona', 'Condomínios Fechados', 'Gestão Patrimonial'],
    bio: 'A AngoReal é uma agência líder em Luanda especializada em imóveis residenciais e corporativos nas zonas de Talatona, Miramar e Marginal.',
    image: ASSETS.propCommercialLuanda,
    phone: '+244 923 450 100',
    email: 'angoreal@kiimoveis.ao',
    closedDeals: 185,
    responseRate: '99%',
    subscriptionPlan: 'gold',
  },
  {
    id: 'a2',
    name: 'Francisco Costa',
    type: 'agent',
    location: 'Benguela',
    rating: 4.8,
    reviews: 28,
    verified: true,
    experience: '8 anos',
    specialties: ['Imóveis de Luxo', 'Frente Mar', 'Benguela & Luanda'],
    bio: 'Francisco é um consultor sénior especializado no mercado residencial e turístico entre Luanda e Benguela, com foco em atendimento personalizado.',
    image: ASSETS.agentMale,
    phone: '+244 923 000 000',
    email: 'francisco.costa@kiimoveis.ao',
    closedDeals: 120,
    responseRate: '98%',
    subscriptionPlan: 'silver',
  },
  {
    id: 'a3',
    name: 'Elite Homes Luanda',
    type: 'agency',
    location: 'Luanda',
    rating: 5.0,
    reviews: 47,
    verified: true,
    experience: '10 anos',
    specialties: ['Mansões no Mussulo', 'Coberturas Exclusivas', 'Investimento Corporativo'],
    bio: 'Boutique imobiliária dedicada a propriedades de alto padrão na Ilha do Mussulo, Talatona e Centro de Luanda.',
    image: ASSETS.propMussuloMansion,
    phone: '+244 924 880 220',
    email: 'elitehomes@kiimoveis.ao',
    closedDeals: 210,
    responseRate: '99%',
    subscriptionPlan: 'gold',
  },
  {
    id: 'a4',
    name: 'Maria Santos',
    type: 'agent',
    location: 'Huíla',
    rating: 4.7,
    reviews: 19,
    verified: false,
    experience: '5 anos',
    specialties: ['Moradias Familiares', 'Lubango & Sul', 'Arrendamento Residencial'],
    bio: 'Consultora independente dedicada ao mercado da Huíla e Namibe, ajudando famílias e investidores a fechar negócios transparentes.',
    image: ASSETS.agentFemale,
    phone: '+244 931 210 340',
    email: 'maria.santos@kiimoveis.ao',
    closedDeals: 44,
    responseRate: '95%',
    subscriptionPlan: 'free',
  },
];

const now = Date.now();

const SEEDED_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Flat de Luxo Vista Mar em Talatona',
    description:
      'Espaçoso apartamento T3 com acabamentos contemporâneos, varanda panorâmica sobre a costa e acesso a piscina e segurança 24h em condomínio de referência.',
    price: 450000,
    type: 'apartment',
    category: 'featured',
    location: { province: 'Luanda', city: 'Talatona', address: 'Via AL1, Condomínio Mirante', lat: -8.922, lng: 13.181 },
    details: { bedrooms: 3, bathrooms: 2, area: 145, furnished: true },
    amenities: ['Wi-Fi', 'Piscina', 'Segurança 24h', 'Ar Condicionado', 'Varanda', 'Estacionamento'],
    images: [ASSETS.propTalatonaFlat, ASSETS.heroLuandaLuxury, ASSETS.propBenguelaStudio],
    agentId: 'a1',
    agencyId: 'a1',
    status: 'rent',
    availabilityStatus: 'available',
    isVerified: true,
    rating: 4.94,
    createdAt: now - 86400000 * 1,
    updatedAt: now - 86400000 * 1,
  },
  {
    id: '2',
    title: 'Moradia V4 Contemporânea em Viana',
    description:
      'Moradia isolada de dois pisos com jardim privado, cozinha equipada, garagem para 3 viaturas e acabamentos em madeira natural numa zona residencial tranquila.',
    price: 85000000,
    type: 'house',
    category: 'featured',
    location: { province: 'Luanda', city: 'Viana', address: 'Urbanização Jardim Viana', lat: -8.904, lng: 13.374 },
    details: { bedrooms: 4, bathrooms: 3, area: 310, furnished: false },
    amenities: ['Estacionamento', 'Segurança 24h', 'Cozinha Equipada', 'Varanda'],
    images: [ASSETS.propVianaVilla, ASSETS.propTalatonaFlat],
    agentId: 'a1',
    agencyId: 'a1',
    status: 'sale',
    availabilityStatus: 'sold',
    isVerified: true,
    rating: 4.88,
    createdAt: now - 86400000 * 2,
    updatedAt: now - 86400000 * 2,
  },
  {
    id: '3',
    title: 'Estúdio Frente Mar na Praia Morena',
    description:
      'Estúdio luminoso e mobilado a poucos passos da Praia Morena em Benguela, ideal para estadias executivas ou rendimento turístico.',
    price: 185000,
    type: 'apartment',
    category: 'featured',
    location: { province: 'Benguela', city: 'Benguela', address: 'Av. da Praia Morena, 42', lat: -12.576, lng: 13.405 },
    details: { bedrooms: 1, bathrooms: 1, area: 54, furnished: true },
    amenities: ['Ar Condicionado', 'Wi-Fi', 'Vista para o Mar', 'Mobilado', 'Varanda'],
    images: [ASSETS.propBenguelaStudio, ASSETS.propTalatonaFlat],
    agentId: 'a2',
    status: 'rent',
    availabilityStatus: 'available',
    isVerified: true,
    rating: 4.91,
    createdAt: now - 86400000 * 3,
    updatedAt: now - 86400000 * 3,
  },
  {
    id: '4',
    title: 'Mansão Exclusiva à Beira-Mar no Mussulo',
    description:
      'Propriedade singular na Ilha do Mussulo com praia privada, piscina infinita aquecida, deck em madeira exótica e 6 suítes completas.',
    price: 1800000,
    type: 'luxury',
    category: 'luxury',
    location: { province: 'Luanda', city: 'Mussulo', address: 'Ponta da Ilha do Mussulo', lat: -8.936, lng: 13.105 },
    details: { bedrooms: 6, bathrooms: 5, area: 780, furnished: true },
    amenities: ['Piscina', 'Vista para o Mar', 'Segurança 24h', 'Mobilado', 'Ar Condicionado', 'Cozinha Equipada'],
    images: [ASSETS.propMussuloMansion, ASSETS.heroLuandaLuxury, ASSETS.propTalatonaFlat],
    agentId: 'a3',
    status: 'rent',
    availabilityStatus: 'rented',
    isVerified: true,
    rating: 4.99,
    createdAt: now - 86400000 * 4,
    updatedAt: now - 86400000 * 4,
  },
  {
    id: '5',
    title: 'Cobertura Duplex na Marginal de Luanda',
    description:
      'Cobertura de alto padrão com terraço privativo, piscina de borda infinita e vista deslumbrante sobre a Baía de Luanda.',
    price: 240000000,
    type: 'luxury',
    category: 'luxury',
    location: { province: 'Luanda', city: 'Luanda', address: 'Av. 4 de Fevereiro, Marginal', lat: -8.814, lng: 13.234 },
    details: { bedrooms: 4, bathrooms: 4, area: 390, furnished: true },
    amenities: ['Piscina', 'Ginásio', 'Vista para o Mar', 'Segurança 24h', 'Estacionamento', 'Ar Condicionado'],
    images: [ASSETS.heroLuandaLuxury, ASSETS.propTalatonaFlat, ASSETS.propMussuloMansion],
    agentId: 'a3',
    status: 'sale',
    availabilityStatus: 'available',
    isVerified: true,
    rating: 4.97,
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 5,
  },
  {
    id: '6',
    title: 'Espaço Comercial Premium em Ingombota',
    description:
      'Loja e piso corporativo envidraçado no coração financeiro de Luanda com receção, climatização central e parque privativo.',
    price: 950000,
    type: 'commercial',
    category: 'commercial',
    location: { province: 'Luanda', city: 'Luanda', address: 'Rua Rainha Ginga, Ingombota', lat: -8.818, lng: 13.236 },
    details: { bedrooms: 2, bathrooms: 3, area: 260, furnished: false },
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Estacionamento', 'Segurança 24h'],
    images: [ASSETS.propCommercialLuanda, ASSETS.propTalatonaFlat],
    agentId: 'a1',
    agencyId: 'a1',
    status: 'rent',
    availabilityStatus: 'available',
    isVerified: true,
    rating: 4.86,
    createdAt: now - 86400000 * 6,
    updatedAt: now - 86400000 * 6,
  },
  {
    id: '7',
    title: 'Apartamento T2 Moderno no Lobito',
    description:
      'Apartamento T2 totalmente remodelado na Restinga do Lobito, próximo a restaurantes e serviços, pronto a habitar.',
    price: 38000000,
    type: 'apartment',
    category: 'featured',
    location: { province: 'Benguela', city: 'Lobito', address: 'Zona da Restinga, Lobito', lat: -12.364, lng: 13.536 },
    details: { bedrooms: 2, bathrooms: 2, area: 98, furnished: true },
    amenities: ['Ar Condicionado', 'Wi-Fi', 'Varanda', 'Estacionamento'],
    images: [ASSETS.propTalatonaFlat, ASSETS.propBenguelaStudio],
    agentId: 'a2',
    status: 'sale',
    availabilityStatus: 'sold',
    isVerified: true,
    rating: 4.82,
    createdAt: now - 86400000 * 7,
    updatedAt: now - 86400000 * 7,
  },
  {
    id: '8',
    title: 'Vivenda T3 Familiar no Lubango',
    description:
      'Moradia acolhedora com jardim arborizado e vista para a Serra da Leba, ideal para famílias que procuram tranquilidade na Huíla.',
    price: 52000000,
    type: 'house',
    category: 'featured',
    location: { province: 'Huíla', city: 'Lubango', address: 'Bairro Senhora do Monte', lat: -14.917, lng: 13.492 },
    details: { bedrooms: 3, bathrooms: 2, area: 210, furnished: false },
    amenities: ['Estacionamento', 'Cozinha Equipada', 'Varanda'],
    images: [ASSETS.propVianaVilla, ASSETS.propBenguelaStudio],
    agentId: 'a4',
    status: 'sale',
    availabilityStatus: 'available',
    isVerified: false,
    rating: 4.75,
    createdAt: now - 86400000 * 8,
    updatedAt: now - 86400000 * 8,
  },
  {
    id: '9',
    title: 'Apartamento T3 Executivo em Cabinda',
    description:
      'Apartamento espaçoso no centro de Cabinda com gerador dedicado, segurança permanente e fácil acesso ao porto e aeroporto.',
    price: 320000,
    type: 'apartment',
    category: 'featured',
    location: { province: 'Cabinda', city: 'Cabinda', address: 'Av. 4 de Fevereiro, Centro', lat: -5.55, lng: 12.2 },
    details: { bedrooms: 3, bathrooms: 2, area: 130, furnished: true },
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Segurança 24h', 'Estacionamento'],
    images: [ASSETS.propBenguelaStudio, ASSETS.propTalatonaFlat],
    agentId: 'a2',
    status: 'rent',
    availabilityStatus: 'rented',
    isVerified: true,
    rating: 4.85,
    createdAt: now - 86400000 * 9,
    updatedAt: now - 86400000 * 9,
  },
  {
    id: '10',
    title: 'Residência T4 com Piscina em Kilamba',
    description:
      'Moradia espaçosa de 4 quartos na Centralidade do Kilamba com área gourmet e piscina privada.',
    price: 68000000,
    type: 'house',
    category: 'featured',
    location: { province: 'Luanda', city: 'Kilamba', address: 'Quarteirão J, Kilamba', lat: -9.001, lng: 13.268 },
    details: { bedrooms: 4, bathrooms: 3, area: 240, furnished: false },
    amenities: ['Piscina', 'Estacionamento', 'Segurança 24h', 'Cozinha Equipada'],
    images: [ASSETS.propVianaVilla, ASSETS.propMussuloMansion],
    agentId: 'a4',
    status: 'sale',
    availabilityStatus: 'rented',
    isVerified: true,
    rating: 4.79,
    createdAt: now - 86400000 * 10,
    updatedAt: now - 86400000 * 10,
  },
];

function getDeletedAgentRecords(): { ids: string[]; emails: string[] } {
  if (typeof window === 'undefined') return { ids: [], emails: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_AGENTS_KEY) || '{}');
    return {
      ids: Array.isArray(raw?.ids) ? raw.ids : [],
      emails: Array.isArray(raw?.emails) ? raw.emails.map((e: string) => e.toLowerCase()) : [],
    };
  } catch {
    return { ids: [], emails: [] };
  }
}

export function isAccountDeleted(uid?: string, email?: string): boolean {
  const deleted = getDeletedAgentRecords();
  if (uid && deleted.ids.includes(uid)) return true;
  if (email && deleted.emails.includes(email.trim().toLowerCase())) return true;
  return false;
}

export function isAgentBlocked(agentId?: string): boolean {
  if (!agentId || typeof window === 'undefined') return false;
  if (isAccountDeleted(agentId)) return true;
  try {
    const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
    const match = profiles.find((p) => p.id === agentId || p.uid === agentId);
    return match?.licenseStatus === 'blocked';
  } catch {
    return false;
  }
}

function savePropertiesSafely(list: Property[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(list));
  } catch {
    // Trim extra base64 gallery images on older listings if localStorage quota is tight
    const compacted = list.map((item, idx) => {
      if (idx === 0) return item;
      if (Array.isArray(item.images) && item.images.length > 2) {
        return { ...item, images: item.images.slice(0, 2) };
      }
      return item;
    });
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(compacted));
  }
}

export function getProperties(): Property[] {
  if (typeof window === 'undefined') return SEEDED_PROPERTIES;
  const raw = localStorage.getItem(PROPERTIES_KEY);
  if (!raw) {
    savePropertiesSafely(SEEDED_PROPERTIES);
    return SEEDED_PROPERTIES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEEDED_PROPERTIES;
  } catch {
    return SEEDED_PROPERTIES;
  }
}

export function getPublicProperties(): Property[] {
  return getProperties().filter((p) => !isAgentBlocked(p.agentId));
}

export function getPropertyById(id: string): Property | undefined {
  return getProperties().find((p) => p.id === id);
}

export function addProperty(input: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
  const properties = getProperties();
  const created: Property = {
    ...input,
    isFeatured: input.isFeatured ?? true,
    id: 'prop-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  savePropertiesSafely([created, ...properties]);
  emitDataUpdate();
  return created;
}

export function updateProperty(id: string, updates: Partial<Property>): Property | null {
  const properties = getProperties();
  const previous = properties.find((p) => p.id === id);
  let updatedItem: Property | null = null;
  const next = properties.map((p) => {
    if (p.id === id) {
      updatedItem = { ...p, ...updates, updatedAt: Date.now() };
      return updatedItem;
    }
    return p;
  });
  savePropertiesSafely(next);
  emitDataUpdate();

  if (
    previous &&
    updatedItem &&
    updates.availabilityStatus &&
    previous.availabilityStatus !== updates.availabilityStatus
  ) {
    const statusLabels: Record<AvailabilityStatus, string> = {
      available: 'Disponível',
      sold: 'Vendido',
      rented: 'Alugado',
    };
    const nextLabel = statusLabels[updates.availabilityStatus];
    const recipients = new Map<string, { uid: string; email: string; name?: string }>();

    const allVisits = getVisitRequests();
    for (const v of allVisits) {
      if (v.propertyId === id && v.status !== 'cancelled' && v.userEmail) {
        recipients.set(v.userEmail.toLowerCase(), {
          uid: v.userId,
          email: v.userEmail,
          name: v.userName,
        });
      }
    }

    const allUsers = getAllUserProfiles();
    for (const u of allUsers) {
      if (u.favorites?.includes(id) && u.email) {
        recipients.set(u.email.toLowerCase(), {
          uid: u.uid,
          email: u.email,
          name: u.displayName,
        });
      }
      if ((u.uid === updatedItem.ownerId || u.uid === updatedItem.agentId) && u.email) {
        recipients.set(u.email.toLowerCase(), {
          uid: u.uid,
          email: u.email,
          name: u.displayName,
        });
      }
    }

    for (const recipient of recipients.values()) {
      void dispatchNotification({
        userId: recipient.uid,
        userEmail: recipient.email,
        recipientName: recipient.name,
        type: 'property_status_changed',
        title: `Estado alterado: ${updatedItem.title}`,
        message: `O imóvel "${updatedItem.title}" (${updatedItem.location.city}, ${updatedItem.location.province}) passou para o estado "${nextLabel}".`,
        emailSubject: `[Ki-Imóveis] Atualização de estado: ${updatedItem.title} (${nextLabel})`,
        relatedId: updatedItem.id,
        link: `/property/${updatedItem.id}`,
      });
    }
  }

  return updatedItem;
}

export function deleteProperty(id: string) {
  const properties = getProperties();
  const next = properties.filter((p) => p.id !== id);
  savePropertiesSafely(next);
  emitDataUpdate();
}

export interface PropertySearchFilters {
  location?: string;
  province?: string;
  type?: string; // 'all' | 'apartment' | 'house' | 'luxury' | 'commercial'
  bedrooms?: number | 'any'; // 1, 2, 3, 4 (4 means 4+)
  intent?: 'all' | 'sale' | 'rent';
  maxPrice?: number;
  availability?: 'all' | AvailabilityStatus;
  agentId?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc';
  featuredFirst?: boolean;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterProperties(properties: Property[], filters: PropertySearchFilters): Property[] {
  const result = properties.filter((p) => {
    if (filters.agentId && p.agentId !== filters.agentId) return false;

    if (filters.type && filters.type !== 'all' && p.type !== filters.type) return false;

    if (filters.intent && filters.intent !== 'all' && p.status !== filters.intent) return false;

    if (filters.availability && filters.availability !== 'all') {
      const currentAvail = p.availabilityStatus || 'available';
      if (currentAvail !== filters.availability) return false;
    }

    if (filters.province && filters.province !== 'all') {
      if (normalizeText(p.location.province) !== normalizeText(filters.province)) return false;
    }

    if (filters.location && filters.location.trim()) {
      const queryTokens = normalizeText(filters.location)
        .split(/[\s,·-]+/)
        .filter((t) => t.length > 1);
      const searchable = normalizeText(
        `${p.location.province} ${p.location.city} ${p.location.address} ${p.title}`
      );
      const matchesAll = queryTokens.every((token) => searchable.includes(token));
      if (!matchesAll) return false;
    }

    if (filters.bedrooms && filters.bedrooms !== 'any') {
      if (filters.bedrooms >= 4) {
        if (p.details.bedrooms < 4) return false;
      } else if (p.details.bedrooms !== filters.bedrooms) {
        return false;
      }
    }

    if (filters.maxPrice && filters.maxPrice > 0) {
      if (p.price > filters.maxPrice) return false;
    }

    return true;
  });

  if (filters.sort === 'price_asc') {
    return [...result].sort((a, b) => a.price - b.price);
  }
  if (filters.sort === 'price_desc') {
    return [...result].sort((a, b) => b.price - a.price);
  }
  if (filters.featuredFirst) {
    return [...result].sort((a, b) => {
      const aFeat = a.isFeatured || a.category === 'featured' ? 1 : 0;
      const bFeat = b.isFeatured || b.category === 'featured' ? 1 : 0;
      if (bFeat !== aFeat) return bFeat - aFeat;
      return b.createdAt - a.createdAt;
    });
  }
  return [...result].sort((a, b) => b.createdAt - a.createdAt);
}

// Lookup coordinates for any Angolan city/province
export function getCoordinatesForLocation(province: string, city?: string): { lat: number; lng: number } {
  const needle = normalizeText(`${city || ''} ${province}`);
  const match =
    ANGOLA_LOCATIONS.find(
      (loc) =>
        (city && normalizeText(loc.city) === normalizeText(city)) ||
        needle.includes(normalizeText(loc.city))
    ) || ANGOLA_LOCATIONS.find((loc) => normalizeText(loc.province) === normalizeText(province));

  if (match) return { lat: match.lat, lng: match.lng };
  return { lat: -8.839, lng: 13.289 }; // Luanda center default
}

export function findNearestLocationLabel(lat: number, lng: number): string {
  let best = ANGOLA_LOCATIONS[0];
  let minDist = Infinity;
  for (const loc of ANGOLA_LOCATIONS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < minDist) {
      minDist = d;
      best = loc;
    }
  }
  return best.province;
}

export function getAgentEvaluations(): Record<string, AgentEvaluation> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(EVALUATIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function evaluateAgent(
  agentId: string,
  rating: number,
  note: string,
  verified: boolean,
  evaluatedBy = ADMIN_EMAIL
) {
  if (typeof window === 'undefined') return;
  const evals = getAgentEvaluations();
  const safeRating = Math.min(5, Math.max(1, Number(rating.toFixed(1))));
  const evaluation: AgentEvaluation = {
    rating: safeRating,
    note: note.trim(),
    evaluatedAt: Date.now(),
    evaluatedBy,
  };
  evals[agentId] = evaluation;
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(evals));

  // Sync matching profile if registered
  const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  const updatedProfiles = profiles.map((p) => {
    if (p.id === agentId) {
      return {
        ...p,
        rating: safeRating,
        verified,
        adminEvaluation: evaluation,
        updatedAt: Date.now(),
      };
    }
    return p;
  });
  localStorage.setItem('offline_db_profiles', JSON.stringify(updatedProfiles));
  emitDataUpdate();
}

// --- AGENTS DIRECTORY (merges seeded agents + approved registered agents) ---
export function getAllAgents(includeModerated = false): AgentDirectoryItem[] {
  ensureSeededLocalDb();
  const profiles: any[] =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('offline_db_profiles') || '[]') : [];
  const evals = getAgentEvaluations();

  const mergedMap = new Map<string, AgentDirectoryItem>();
  for (const ag of DEFAULT_AGENTS) {
    if (isAccountDeleted(ag.id, ag.email)) continue;
    const matchingProfile = profiles.find((p) => p.id === ag.id || p.email === ag.email);
    const status = matchingProfile?.licenseStatus || 'active';
    if (!includeModerated && status === 'blocked') continue;
    const adminEval = evals[ag.id] || matchingProfile?.adminEvaluation;
    mergedMap.set(ag.id, {
      ...ag,
      verified: matchingProfile ? Boolean(matchingProfile.verified) : ag.verified,
      subscriptionPlan: matchingProfile?.subscriptionPlan || ag.subscriptionPlan,
      licenseStatus: status,
      licenseNumber: matchingProfile?.licenseNumber,
      statusReason: matchingProfile?.statusReason,
      rating: adminEval?.rating ?? matchingProfile?.rating ?? ag.rating,
      adminEvaluation: adminEval,
      image: matchingProfile?.photoURL || ag.image,
      name: matchingProfile?.displayName || ag.name,
    });
  }

  for (const p of profiles) {
    if (isAccountDeleted(p.id, p.email)) continue;
    if ((p.role === 'agent' || p.role === 'agency_admin') && !mergedMap.has(p.id)) {
      const status = p.licenseStatus || 'active';
      if (!includeModerated && status === 'blocked') continue;
      const adminEval = evals[p.id] || p.adminEvaluation;
      mergedMap.set(p.id, {
        id: p.id,
        name: p.displayName || p.email?.split('@')[0] || 'Consultor Ki-Imóveis',
        type: p.role === 'agency_admin' ? 'agency' : 'agent',
        location: p.address || p.location || 'Luanda',
        rating: adminEval?.rating ?? p.rating ?? 4.8,
        reviews: 12,
        verified: Boolean(p.verified),
        experience: '3 anos',
        specialties: ['Compra e Venda', 'Arrendamento', p.address || 'Luanda'],
        bio: p.bio || 'Agente parceiro registado na plataforma Ki-Imóveis Angola.',
        image: p.photoURL || ASSETS.agentMale,
        phone: p.phoneNumber || '+244 923 000 000',
        email: p.email,
        closedDeals: 15,
        responseRate: '96%',
        subscriptionPlan: p.subscriptionPlan || 'free',
        licenseStatus: status,
        licenseNumber: p.licenseNumber,
        statusReason: p.statusReason,
        adminEvaluation: adminEval,
      });
    }
  }

  return Array.from(mergedMap.values());
}

export function getAgentById(id: string, includeModerated = false): AgentDirectoryItem | undefined {
  return getAllAgents(includeModerated).find((a) => a.id === id);
}

// --- VISITS ---
export function getVisitRequests(): VisitRequest[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(VISITS_KEY);
  if (!raw) {
    const seeded: VisitRequest[] = [
      {
        id: 'visit-1',
        propertyId: '1',
        propertyTitle: 'Flat de Luxo Vista Mar em Talatona',
        propertyImage: ASSETS.propTalatonaFlat,
        userId: '81778693-3185-458f-8027-bee0b24c15a2',
        userName: 'Pedro Silva',
        userEmail: 'puzumak17@gmail.com',
        userPhone: '+244 922 555 019',
        agentId: 'a1',
        date: '2026-12-05',
        time: '10:30',
        intent: 'visit',
        status: 'pending',
        message: 'Gostaria de conhecer as áreas comuns do condomínio.',
        createdAt: Date.now() - 3600000 * 6,
      },
    ];
    localStorage.setItem(VISITS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function createVisitRequest(input: Omit<VisitRequest, 'id' | 'createdAt' | 'status'>): VisitRequest {
  const visits = getVisitRequests();
  const created: VisitRequest = {
    ...input,
    id: 'visit-' + Date.now(),
    status: 'pending',
    createdAt: Date.now(),
  };
  localStorage.setItem(VISITS_KEY, JSON.stringify([created, ...visits]));
  emitDataUpdate();

  const intentText =
    input.intent === 'buy'
      ? 'Proposta de compra'
      : input.intent === 'rent'
      ? 'Pedido de arrendamento'
      : 'Agendamento de visita';

  if (input.userEmail) {
    void dispatchNotification({
      userId: input.userId,
      userEmail: input.userEmail,
      recipientName: input.userName,
      type: 'visit_created',
      title: `${intentText} registado`,
      message: `O seu pedido para "${input.propertyTitle}" no dia ${input.date} às ${input.time} foi registado e aguarda confirmação do agente.`,
      emailSubject: `[Ki-Imóveis] ${intentText} recebido — ${input.propertyTitle}`,
      relatedId: created.id,
      link: '/dashboard?tab=calendar',
    });
  }

  const agent = getAgentById(input.agentId);
  const agentProfile = getAllUserProfiles().find((u) => u.uid === input.agentId);
  const agentEmail = agentProfile?.email || agent?.email;
  if (agentEmail && agentEmail.toLowerCase() !== input.userEmail?.toLowerCase()) {
    void dispatchNotification({
      userId: agentProfile?.uid || input.agentId,
      userEmail: agentEmail,
      recipientName: agentProfile?.displayName || agent?.name,
      type: 'visit_created',
      title: `Novo ${intentText.toLowerCase()} recebido`,
      message: `${input.userName} (${input.userEmail}) solicitou ${intentText.toLowerCase()} para "${input.propertyTitle}" em ${input.date} às ${input.time}.`,
      emailSubject: `[Ki-Imóveis] Novo pedido de cliente — ${input.propertyTitle}`,
      relatedId: created.id,
      link: '/dashboard?tab=calendar',
    });
  }

  return created;
}

export function updateVisitStatus(id: string, status: VisitRequest['status']) {
  const visits = getVisitRequests();
  const target = visits.find((v) => v.id === id);
  const next = visits.map((v) => (v.id === id ? { ...v, status } : v));
  localStorage.setItem(VISITS_KEY, JSON.stringify(next));
  emitDataUpdate();

  if (target && target.status !== status && (status === 'confirmed' || status === 'cancelled')) {
    const isConfirmed = status === 'confirmed';
    const statusLabel = isConfirmed ? 'Confirmada' : 'Cancelada';
    if (target.userEmail) {
      void dispatchNotification({
        userId: target.userId,
        userEmail: target.userEmail,
        recipientName: target.userName,
        type: isConfirmed ? 'visit_confirmed' : 'visit_cancelled',
        title: `Visita ${statusLabel}: ${target.propertyTitle}`,
        message: isConfirmed
          ? `A sua visita ao imóvel "${target.propertyTitle}" marcada para ${target.date} às ${target.time} foi CONFIRMADA pelo agente responsável.`
          : `Informamos que a sua visita ao imóvel "${target.propertyTitle}" (${target.date} às ${target.time}) foi cancelada. Pode agendar nova data na página do imóvel.`,
        emailSubject: `[Ki-Imóveis] Visita ${statusLabel} — ${target.propertyTitle}`,
        relatedId: target.id,
        link: '/dashboard?tab=calendar',
      });
    }
  }
}

export function formatPlanPriceLabel(priceAOA: number): string {
  const safe = Math.max(0, Math.round(Number(priceAOA) || 0));
  if (safe === 0) return 'Grátis';
  return `${safe.toLocaleString('pt-PT')} Kz`;
}

export function getPlanCatalog(): Record<SubscriptionPlan, PlanCatalogItem> {
  const defaults: Record<SubscriptionPlan, PlanCatalogItem> = {
    free: {
      ...PLAN_CATALOG.free,
      features: [...PLAN_CATALOG.free.features],
      defaultPermissions: { ...PLAN_CATALOG.free.defaultPermissions },
    },
    silver: {
      ...PLAN_CATALOG.silver,
      features: [...PLAN_CATALOG.silver.features],
      defaultPermissions: { ...PLAN_CATALOG.silver.defaultPermissions },
    },
    gold: {
      ...PLAN_CATALOG.gold,
      features: [...PLAN_CATALOG.gold.features],
      defaultPermissions: { ...PLAN_CATALOG.gold.defaultPermissions },
    },
  };

  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(PLAN_CATALOG_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    (['free', 'silver', 'gold'] as SubscriptionPlan[]).forEach((key) => {
      if (parsed?.[key]) {
        defaults[key] = {
          ...defaults[key],
          ...parsed[key],
          features: Array.isArray(parsed[key].features)
            ? parsed[key].features
            : defaults[key].features,
          defaultPermissions: {
            ...defaults[key].defaultPermissions,
            ...(parsed[key].defaultPermissions || {}),
          },
        };
      }
    });
    return defaults;
  } catch {
    return defaults;
  }
}

export function updatePlanCatalogItem(
  planKey: SubscriptionPlan,
  updates: Partial<PlanCatalogItem>,
  syncExistingUsers = false
): Record<SubscriptionPlan, PlanCatalogItem> {
  const catalog = getPlanCatalog();
  const current = catalog[planKey];
  const nextPriceAOA =
    updates.priceAOA !== undefined
      ? Math.max(0, Math.round(Number(updates.priceAOA) || 0))
      : current.priceAOA;

  const nextItem: PlanCatalogItem = {
    ...current,
    ...updates,
    priceAOA: nextPriceAOA,
    priceLabel:
      updates.priceLabel !== undefined && updates.priceLabel.trim()
        ? updates.priceLabel.trim()
        : updates.priceAOA !== undefined
        ? formatPlanPriceLabel(nextPriceAOA)
        : current.priceLabel,
    billingPeriod:
      updates.billingPeriod !== undefined ? updates.billingPeriod.trim() : current.billingPeriod,
    badgeText:
      updates.badgeText !== undefined ? updates.badgeText.trim() : current.badgeText,
    highlighted:
      updates.highlighted !== undefined ? Boolean(updates.highlighted) : current.highlighted,
    ctaLabel:
      updates.ctaLabel !== undefined ? updates.ctaLabel.trim() : current.ctaLabel,
    features: updates.features
      ? updates.features.map((f) => f.trim()).filter(Boolean)
      : current.features,
    defaultPermissions: {
      ...current.defaultPermissions,
      ...(updates.defaultPermissions || {}),
    },
  };

  const nextCatalog = {
    ...catalog,
    [planKey]: nextItem,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAN_CATALOG_KEY, JSON.stringify(nextCatalog));
    if (syncExistingUsers) {
      const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
      const updatedProfiles = profiles.map((p) => {
        const isRoot = p.email?.toLowerCase() === ADMIN_EMAIL;
        if (!isRoot && (p.subscriptionPlan || 'free') === planKey) {
          return {
            ...p,
            verified: nextItem.defaultPermissions.verifiedBadge,
            permissions: { ...nextItem.defaultPermissions },
            updatedAt: Date.now(),
          };
        }
        return p;
      });
      localStorage.setItem('offline_db_profiles', JSON.stringify(updatedProfiles));
    }
  }

  emitDataUpdate();
  return nextCatalog;
}

export function resetPlanCatalog(): Record<SubscriptionPlan, PlanCatalogItem> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PLAN_CATALOG_KEY);
  }
  emitDataUpdate();
  return getPlanCatalog();
}

// --- ADMIN: USERS, LICENSES & PERMISSIONS ---
export function getAllUserProfiles(): UserProfile[] {
  ensureSeededLocalDb();
  if (typeof window === 'undefined') return [];
  const catalog = getPlanCatalog();
  const raw: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  return raw
    .filter((p) => !isAccountDeleted(p.id || p.uid, p.email))
    .map((p) => {
      const isAdmin = p.email?.toLowerCase() === ADMIN_EMAIL;
      const plan: SubscriptionPlan = isAdmin ? 'gold' : p.subscriptionPlan || 'free';
      return {
        ...p,
        uid: p.id || p.uid,
        email: p.email || '',
        displayName: p.displayName || p.full_name || p.email?.split('@')[0] || 'Usuário',
        role: isAdmin ? 'admin' : p.role || 'user',
        favorites: Array.isArray(p.favorites) ? p.favorites : [],
        subscriptionPlan: plan,
        licenseStatus: isAdmin ? 'active' : p.licenseStatus || 'active',
        permissions: isAdmin
          ? ADMIN_MANAGEMENT_PERMISSIONS
          : p.permissions || catalog[plan].defaultPermissions,
      } as UserProfile;
    });
}

export function adminUpdateUserProfile(uid: string, updates: Partial<UserProfile>): UserProfile | null {
  ensureSeededLocalDb();
  const raw: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  let updated: UserProfile | null = null;
  const next = raw.map((p) => {
    if (p.id === uid || p.uid === uid) {
      const merged = { ...p, ...updates, updatedAt: Date.now() };
      updated = { ...merged, uid: merged.id || uid } as UserProfile;
      return merged;
    }
    return p;
  });
  localStorage.setItem('offline_db_profiles', JSON.stringify(next));
  emitDataUpdate();
  return updated;
}

export function setAccountModerationStatus(
  targetId: string,
  nextStatus: 'active' | 'suspended' | 'blocked',
  reason?: string
): UserProfile | null {
  ensureSeededLocalDb();
  if (typeof window === 'undefined') return null;

  const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  let targetProfile = profiles.find((p) => p.id === targetId || p.uid === targetId);

  if (!targetProfile) {
    const seededAgent = DEFAULT_AGENTS.find((a) => a.id === targetId);
    if (seededAgent) {
      targetProfile = {
        id: seededAgent.id,
        email: seededAgent.email,
        displayName: seededAgent.name,
        role: seededAgent.type === 'agency' ? 'agency_admin' : 'agent',
        subscriptionPlan: seededAgent.subscriptionPlan || 'silver',
        licenseStatus: 'active',
        verified: seededAgent.verified,
        permissions: getDefaultPermissionsForPlan(seededAgent.subscriptionPlan || 'silver'),
        phoneNumber: seededAgent.phone,
        address: seededAgent.location,
        favorites: [],
        createdAt: Date.now(),
      };
      profiles.push(targetProfile);
    }
  }

  if (!targetProfile) return null;
  if (targetProfile.email?.toLowerCase() === ADMIN_EMAIL) return null;

  const plan: SubscriptionPlan = targetProfile.subscriptionPlan || 'free';
  const basePermissions = getDefaultPermissionsForPlan(plan);
  const nextPermissions: UserPermissions =
    nextStatus === 'active'
      ? basePermissions
      : {
          ...basePermissions,
          canPublishListings: false,
          canFeatureListings: false,
          canAccessLeads: false,
          verifiedBadge: false,
        };

  const nextProfiles = profiles.map((p) => {
    if (p.id === targetId || p.uid === targetId) {
      return {
        ...p,
        licenseStatus: nextStatus,
        verified: nextStatus === 'active' ? basePermissions.verifiedBadge : false,
        permissions: nextPermissions,
        statusReason: reason || (nextStatus === 'active' ? '' : p.statusReason),
        updatedAt: Date.now(),
      };
    }
    return p;
  });

  localStorage.setItem('offline_db_profiles', JSON.stringify(nextProfiles));
  emitDataUpdate();

  const statusText =
    nextStatus === 'blocked'
      ? 'BLOQUEADA'
      : nextStatus === 'suspended'
      ? 'SUSPENSA'
      : 'REATIVADA';

  if (targetProfile.email) {
    void dispatchNotification({
      userId: targetProfile.id || targetId,
      userEmail: targetProfile.email,
      recipientName: targetProfile.displayName,
      type: 'license_status_changed',
      title: `Conta ${statusText} pela Administração`,
      message:
        nextStatus === 'active'
          ? 'A sua conta de agente/agência foi reativada pela administração Ki-Imóveis e já pode publicar imóveis.'
          : `A sua conta foi ${statusText.toLowerCase()} pela administração Ki-Imóveis.${reason ? ` Motivo: ${reason}` : ''}`,
      emailSubject: `[Ki-Imóveis] Estatuto da conta atualizado: ${statusText}`,
      relatedId: targetId,
      link: '/dashboard?tab=settings',
    });
  }

  return nextProfiles.find((p) => p.id === targetId || p.uid === targetId) || null;
}

export function deleteAgentOrAgency(targetId: string, removeListings = true): boolean {
  ensureSeededLocalDb();
  if (typeof window === 'undefined') return false;

  const profiles: any[] = JSON.parse(localStorage.getItem('offline_db_profiles') || '[]');
  const matchProfile = profiles.find((p) => p.id === targetId || p.uid === targetId);
  const matchSeeded = DEFAULT_AGENTS.find((a) => a.id === targetId);
  const email = (matchProfile?.email || matchSeeded?.email || '').trim().toLowerCase();

  if (email === ADMIN_EMAIL) return false;

  const deleted = getDeletedAgentRecords();
  const nextIds = Array.from(new Set([...deleted.ids, targetId]));
  const nextEmails = email ? Array.from(new Set([...deleted.emails, email])) : deleted.emails;
  localStorage.setItem(
    DELETED_AGENTS_KEY,
    JSON.stringify({ ids: nextIds, emails: nextEmails })
  );

  const remainingProfiles = profiles.filter(
    (p) => p.id !== targetId && p.uid !== targetId && p.email?.toLowerCase() !== email
  );
  localStorage.setItem('offline_db_profiles', JSON.stringify(remainingProfiles));

  try {
    const apps: any[] = JSON.parse(localStorage.getItem('offline_db_partner_applications') || '[]');
    const remainingApps = apps.filter(
      (a) => a.userId !== targetId && (!email || a.userEmail?.toLowerCase() !== email)
    );
    localStorage.setItem('offline_db_partner_applications', JSON.stringify(remainingApps));
  } catch {
    // Safe ignore
  }

  if (removeListings) {
    const remainingProps = getProperties().filter(
      (prop) => prop.agentId !== targetId && prop.ownerId !== targetId
    );
    savePropertiesSafely(remainingProps);
  }

  emitDataUpdate();
  return true;
}

export function getDefaultPermissionsForPlan(plan: SubscriptionPlan): UserPermissions {
  return { ...getPlanCatalog()[plan].defaultPermissions };
}

// --- IMAGE UPLOAD & PROFILE AVATAR CROPPER ---
export function compressImageFile(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o ficheiro de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function cropSquareAvatarDataUrl(
  imageSrc: string,
  zoom = 1,
  offsetXPercent = 0,
  offsetYPercent = 0,
  outputSize = 256
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Não foi possível processar a foto.'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponível.'));
        return;
      }

      const minDim = Math.min(img.width, img.height);
      const cropSize = minDim / Math.max(1, zoom);
      const maxShiftX = (img.width - cropSize) / 2;
      const maxShiftY = (img.height - cropSize) / 2;

      const sx = Math.max(0, Math.min(img.width - cropSize, (img.width - cropSize) / 2 + (offsetXPercent / 100) * maxShiftX));
      const sy = Math.max(0, Math.min(img.height - cropSize, (img.height - cropSize) / 2 + (offsetYPercent / 100) * maxShiftY));

      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = imageSrc;
  });
}
