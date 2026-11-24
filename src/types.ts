export type SubscriptionPlan = 'free' | 'silver' | 'gold';
export type LicenseStatus = 'active' | 'pending' | 'suspended' | 'expired';
export type AvailabilityStatus = 'available' | 'sold' | 'rented';

export interface UserPermissions {
  canPublishListings: boolean;
  maxListings: number; // -1 means unlimited
  canFeatureListings: boolean;
  canAccessLeads: boolean;
  verifiedBadge: boolean;
}

export interface PlanCatalogItem {
  name: string;
  priceLabel: string;
  priceAOA: number;
  description: string;
  features: string[];
  defaultPermissions: UserPermissions;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number; // in AOA
  type: 'apartment' | 'house' | 'luxury' | 'commercial';
  category: string;
  location: {
    province: string;
    city: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  details: {
    bedrooms: number;
    bathrooms: number;
    area: number; // in m2
    furnished: boolean;
  };
  amenities: string[];
  images: string[];
  agentId: string;
  ownerId?: string;
  agencyId?: string;
  status: 'sale' | 'rent';
  availabilityStatus: AvailabilityStatus;
  isVerified: boolean;
  rating?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AgentEvaluation {
  rating: number;
  note: string;
  evaluatedAt: number;
  evaluatedBy: string;
}

export interface NotificationPreferences {
  emailOnVisitUpdates: boolean;
  emailOnPropertyStatusChanges: boolean;
  emailOnRequestUpdates: boolean;
}

export interface UserProfile {
  uid: string;
  id?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'agent' | 'agency_admin' | 'admin';
  favorites: string[];
  phoneNumber?: string;
  bio?: string;
  location?: string;
  licenseNumber?: string;
  licenseStatus?: LicenseStatus;
  licenseExpiresAt?: number;
  rating?: number;
  totalListings?: number;
  verified?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  packageRequested?: SubscriptionPlan | null;
  permissions?: UserPermissions;
  adminEvaluation?: AgentEvaluation;
  notificationPreferences?: NotificationPreferences;
  address?: string;
  nif?: string;
  createdAt?: number;
}

export interface AgentDirectoryItem {
  id: string;
  name: string;
  type: 'agent' | 'agency';
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  experience: string;
  specialties: string[];
  bio: string;
  image: string;
  phone: string;
  email: string;
  closedDeals: number;
  responseRate: string;
  subscriptionPlan?: SubscriptionPlan;
  licenseStatus?: LicenseStatus;
  licenseNumber?: string;
  adminEvaluation?: AgentEvaluation;
}

export interface AgentApplication {
  id: string;
  userId: string;
  userEmail?: string;
  fullName: string;
  type: 'individual' | 'agency';
  nif: string;
  licenseNumber?: string;
  license?: string;
  documentUrl?: string;
  documents: string[];
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: number;
}

export interface UserSettings {
  phoneNumber?: string;
  address?: string;
  bio?: string;
}

export interface CommissionConfig {
  platformFeePercent: number;
  agentCommissionPercent: number;
}

export interface Transaction {
  id: string;
  propertyId: string;
  amount: number;
  type: 'sale' | 'rent';
  platformFee: number;
  agentEarnings: number;
  agencyEarnings?: number;
  status: 'pending' | 'completed';
  createdAt: number;
}

export interface PropertyRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyDescription: string;
  propertyType?: string;
  location: string;
  address?: string;
  estimatedValue?: number;
  propertyImages?: string[];
  notificationMethod?: string;
  status: 'pending' | 'claimed' | 'completed';
  assignedAgentId?: string;
  createdAt: number;
}

export interface VisitRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  agentId: string;
  date: string;
  time: string;
  intent: 'visit' | 'rent' | 'buy';
  status: 'pending' | 'confirmed' | 'cancelled';
  message?: string;
  createdAt: number;
}

export type NotificationType =
  | 'visit_created'
  | 'visit_confirmed'
  | 'visit_cancelled'
  | 'property_status_changed'
  | 'request_status_changed'
  | 'license_status_changed';

export interface AppNotification {
  id: string;
  userId: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  emailSubject: string;
  emailSent: boolean;
  deliveryProvider: 'smtp' | 'resend' | 'platform_inbox';
  deliveryNote?: string;
  read: boolean;
  relatedId?: string;
  link?: string;
  createdAt: number;
}

export interface GroundedPlaceLink {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: { author?: string; text: string; uri?: string }[];
}

