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
  reserveAmount?: number;
  description?: string;
  shipDate?: string;
  deliveryDate?: string;
  filingDate?: string;
  acknowledgmentDate?: string;
  parentClaimId?: string | null;
  assignedToId?: string | null;
  customerId: string;
  corporateId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  parties?: ClaimParty[];
  products?: ClaimProduct[];
  comments?: ClaimComment[];
  documents?: ClaimDocument[];
  timeline?: ClaimTimeline[];
  tasks?: ClaimTask[];
  payments?: ClaimPayment[];
  identifiers?: ClaimIdentifier[];
  childClaims?: Claim[];
  fraudFlags?: FraudFlag[];
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
  type: 'claimant' | 'carrier' | 'payee' | 'shipper' | 'consignee' | '3pl' | 'insurance';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  scacCode?: string;
  filingStatus?: string;
  filedDate?: string;
  acknowledgedDate?: string;
  carrierClaimNumber?: string;
  carrierResponse?: string;
}

export interface ClaimProduct {
  id: string;
  claimId: string;
  description: string;
  quantity: number;
  weight?: number;
  value?: number;
  claimAmount?: number;
  unitCost?: number;
  sku?: string;
  poNumber?: string;
  condition?: string;
  damageType?: string;
  nmfcCode?: string;
  freightClass?: string;
}

export interface ClaimComment {
  id: string;
  claimId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  type: 'comment' | 'note' | 'system' | 'email';
  parentId?: string | null;
  mentionedUserIds?: string;
  isPinned?: boolean;
  isInternal?: boolean;
  editedAt?: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  replies?: ClaimComment[];
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
  aiProcessingStatus?: string;
  thumbnailKey?: string;
  sortOrder?: number;
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
  roleId?: string;
  customerId?: string;
  corporateId?: string;
  isActive: boolean;
  isSuperAdmin?: boolean;
  emailVerified?: boolean;
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
  corporateId?: string;
  parentId?: string;
  isCorporate?: boolean;
  isActive: boolean;
  planType?: string;
  maxUsers?: number;
  billingEmail?: string;
  createdAt: string;
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
}

export interface CustomerContact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary: boolean;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  type: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
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
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  capacityType?: string;
  isInternational?: boolean;
  isActive: boolean;
  contacts?: CarrierContact[];
}

export interface CarrierContact {
  id: string;
  carrierId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
  reminderMinutes?: number;
  completedAt?: string;
  emailLogId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Payments ---
export interface ClaimPayment {
  id: string;
  claimId: string;
  claimPartyId?: string;
  amount: number;
  transactionType?: string;
  direction?: string;
  paymentStatus?: string;
  type?: string;
  method?: string;
  reference?: string;
  checkNumber?: string;
  glCode?: string;
  payeeName?: string;
  vendorName?: string;
  notes?: string;
  currency?: string;
  expectedDate?: string;
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

// --- Fraud ---
export interface FraudFlag {
  id: string;
  claimId: string;
  type: string;
  severity: string;
  description: string;
  evidence?: Record<string, unknown>;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// --- Workflows ---
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  corporateId?: string;
  trigger: string;
  triggerConfig?: Record<string, unknown>;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  actionType: string;
  config: Record<string, unknown>;
  conditionLogic?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  claimId?: string;
  currentStep: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  nextRunAt?: string;
  log?: Record<string, unknown>;
}

// --- Email ---
export interface EmailLog {
  id: string;
  claimId?: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body?: string;
  contentHtml?: string;
  status: string;
  direction: string;
  messageId?: string;
  inReplyTo?: string;
  threadId?: string;
  attachmentIds?: string[];
  openCount?: number;
  createdAt: string;
}

// --- Notifications ---
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: string;
  inAppSetting: string;
  emailSetting: string;
}
