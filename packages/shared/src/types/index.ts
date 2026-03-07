/**
 * Shared Type Definitions - Domain types used across frontend, API, and AI agent
 *
 * Location: packages/shared/src/types/index.ts
 */

// --- Claims ---
export interface Claim {
  id: string;
  claimNumber: string;
  proNumber: string;
  status: ClaimStatus;
  claimType: ClaimType;
  claimAmount: number;
  settledAmount?: number;
  description?: string;
  shipDate?: string;
  deliveryDate?: string;
  filingDate?: string;
  acknowledgmentDate?: string;
  customerId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  parties?: ClaimParty[];
  products?: ClaimProduct[];
  comments?: ClaimComment[];
  documents?: ClaimDocument[];
  timeline?: ClaimTimeline[];
  tasks?: ClaimTask[];
  payments?: ClaimPayment[];
  identifiers?: ClaimIdentifier[];
}

export type ClaimStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'denied'
  | 'appealed'
  | 'in_negotiation'
  | 'settled'
  | 'closed'
  | 'cancelled';

export type ClaimType =
  | 'damage'
  | 'shortage'
  | 'loss'
  | 'concealed_damage'
  | 'refused'
  | 'theft';

export interface ClaimParty {
  id: string;
  claimId: string;
  type: 'claimant' | 'carrier' | 'payee' | 'shipper' | 'consignee';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scacCode?: string;
}

export interface ClaimProduct {
  id: string;
  claimId: string;
  description: string;
  quantity: number;
  weight?: number;
  value?: number;
  damageType?: string;
}

export interface ClaimComment {
  id: string;
  claimId: string;
  userId: string;
  content: string;
  type: 'comment' | 'note' | 'system' | 'email';
  createdAt: string;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentName: string;
  s3Key: string;
  fileSize?: number;
  mimeType?: string;
  categoryId?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ClaimTimeline {
  id: string;
  claimId: string;
  status: string;
  description?: string;
  changedById: string;
  createdAt: string;
}

// --- Users ---
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  customerId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// --- Customers ---
export interface Customer {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  isActive: boolean;
  createdAt: string;
}

// --- Carriers ---
export interface Carrier {
  id: string;
  name: string;
  scacCode?: string;
  dotNumber?: string;
  mcNumber?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

// --- Shipments ---
export interface Shipment {
  id: string;
  proNumber: string;
  bolNumber?: string;
  carrierId?: string;
  customerId?: string;
  shipDate?: string;
  deliveryDate?: string;
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
}

// --- API Response wrappers ---
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// --- AI ---
export interface AiConversation {
  id: string;
  userId: string;
  title?: string;
  messages: AiMessage[];
  createdAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentRunResult {
  agentType: string;
  status: 'completed' | 'failed' | 'running';
  result: string;
  timestamp: string;
}

// --- Tasks ---
export interface ClaimTask {
  id: string;
  claimId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// --- Payments ---
export interface ClaimPayment {
  id: string;
  claimId: string;
  amount: number;
  type: string;
  method?: string;
  reference?: string;
  receivedAt?: string;
  createdAt: string;
}

// --- Identifiers ---
export interface ClaimIdentifier {
  id: string;
  claimId: string;
  type: string;
  value: string;
  createdAt: string;
}
