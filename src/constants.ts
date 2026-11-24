import { SubscriptionPlan, UserPermissions } from './types';

export const ADMIN_EMAIL = 'scuallyboy@gmail.com';

export const ADMIN_MANAGEMENT_PERMISSIONS: UserPermissions = {
  canPublishListings: false,
  maxListings: 0,
  canFeatureListings: false,
  canAccessLeads: true,
  verifiedBadge: true,
};

export const PROVINCES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte',
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];

export interface LocationPreset {
  label: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
}

export const ANGOLA_LOCATIONS: LocationPreset[] = [
  { label: 'Luanda · Talatona', province: 'Luanda', city: 'Talatona', lat: -8.922, lng: 13.181 },
  { label: 'Luanda · Miramar & Marginal', province: 'Luanda', city: 'Luanda', lat: -8.814, lng: 13.234 },
  { label: 'Luanda · Ilha do Mussulo', province: 'Luanda', city: 'Mussulo', lat: -8.936, lng: 13.105 },
  { label: 'Luanda · Viana & Zango', province: 'Luanda', city: 'Viana', lat: -8.904, lng: 13.374 },
  { label: 'Luanda · Kilamba', province: 'Luanda', city: 'Kilamba', lat: -9.001, lng: 13.268 },
  { label: 'Benguela · Praia Morena', province: 'Benguela', city: 'Benguela', lat: -12.576, lng: 13.405 },
  { label: 'Benguela · Lobito', province: 'Benguela', city: 'Lobito', lat: -12.364, lng: 13.536 },
  { label: 'Huíla · Lubango', province: 'Huíla', city: 'Lubango', lat: -14.917, lng: 13.492 },
  { label: 'Cabinda · Centro', province: 'Cabinda', city: 'Cabinda', lat: -5.55, lng: 12.2 },
  { label: 'Namibe · Moçâmedes', province: 'Namibe', city: 'Moçâmedes', lat: -15.196, lng: 12.152 },
  { label: 'Huambo · Cidade Alta', province: 'Huambo', city: 'Huambo', lat: -12.776, lng: 15.739 },
  { label: 'Cuanza Sul · Sumbe', province: 'Cuanza Sul', city: 'Sumbe', lat: -11.206, lng: 13.843 },
];

export const CATEGORIES = [
  { id: 'apartment', label: 'Apartamentos', icon: 'Building2' },
  { id: 'house', label: 'Moradias', icon: 'Home' },
  { id: 'luxury', label: 'Luxo', icon: 'Gem' },
  { id: 'commercial', label: 'Comercial', icon: 'Store' },
];

export const AMENITIES = [
  'Wi-Fi', 'Piscina', 'Ar Condicionado', 'Estacionamento', 'Segurança 24h',
  'Ginásio', 'Vista para o Mar', 'Varanda', 'Mobilado', 'Cozinha Equipada'
];

export const PLAN_CATALOG: Record<SubscriptionPlan, {
  name: string;
  priceLabel: string;
  priceAOA: number;
  description: string;
  features: string[];
  defaultPermissions: UserPermissions;
}> = {
  free: {
    name: 'Essencial',
    priceLabel: 'Grátis',
    priceAOA: 0,
    description: 'Para proprietários e agentes em início de atividade.',
    features: ['Até 10 Imóveis', 'Painel Básico', 'Gestão de Visitas'],
    defaultPermissions: {
      canPublishListings: true,
      maxListings: 10,
      canFeatureListings: false,
      canAccessLeads: false,
      verifiedBadge: false,
    },
  },
  silver: {
    name: 'Silver Pro',
    priceLabel: '25.000 Kz',
    priceAOA: 25000,
    description: 'Para corretores ativos com carteira em expansão.',
    features: ['Até 50 Imóveis', 'Destaque nos Resultados', 'Acesso a Leads', 'Selo Silver'],
    defaultPermissions: {
      canPublishListings: true,
      maxListings: 50,
      canFeatureListings: true,
      canAccessLeads: true,
      verifiedBadge: true,
    },
  },
  gold: {
    name: 'Gold Elite',
    priceLabel: '65.000 Kz',
    priceAOA: 65000,
    description: 'Para agências e consultores de alto volume em Angola.',
    features: ['Imóveis Ilimitados', 'Prioridade Máxima em Leads', 'Destaque Premium', 'Selo Gold Verificado'],
    defaultPermissions: {
      canPublishListings: true,
      maxListings: -1,
      canFeatureListings: true,
      canAccessLeads: true,
      verifiedBadge: true,
    },
  },
};
