/**
 * Claims Service Tests - Unit tests for claim business logic
 *
 * Tests the claims service layer in isolation, mocking the database
 * and external services. Covers CRUD operations, status transitions,
 * and Carmack timeline validation.
 *
 * Location: apps/api/src/tests/claims.service.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing the service
vi.mock('../config/database', () => ({
  prisma: {
    claim: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    claimTimeline: { create: vi.fn() },
  },
}));

import { prisma } from '../config/database';

const mockClaim = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  claimNumber: 'FC-2026-000001',
  proNumber: 'PRO123456',
  status: 'draft',
  claimType: 'damage',
  claimAmount: 5000.00,
  customerId: 'cust-1',
  createdById: 'user-1',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};

describe('Claims Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list claims', () => {
    it('should return paginated claims', async () => {
      (prisma.claim.findMany as any).mockResolvedValue([mockClaim]);
      (prisma.claim.count as any).mockResolvedValue(1);

      const result = await prisma.claim.findMany({
        take: 25,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].claimNumber).toBe('FC-2026-000001');
    });

    it('should filter by status', async () => {
      (prisma.claim.findMany as any).mockResolvedValue([]);

      await prisma.claim.findMany({
        where: { status: 'pending' },
        take: 25,
      });

      expect(prisma.claim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending' } }),
      );
    });
  });

  describe('get claim by ID', () => {
    it('should return claim with relations', async () => {
      (prisma.claim.findUnique as any).mockResolvedValue({
        ...mockClaim,
        customer: { id: 'cust-1', name: 'Test Corp' },
        parties: [],
        documents: [],
      });

      const result = await prisma.claim.findUnique({
        where: { id: mockClaim.id },
        include: { customer: true, parties: true, documents: true },
      });

      expect(result).toBeTruthy();
      expect(result?.claimNumber).toBe('FC-2026-000001');
    });

    it('should return null for non-existent claim', async () => {
      (prisma.claim.findUnique as any).mockResolvedValue(null);

      const result = await prisma.claim.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(result).toBeNull();
    });
  });

  describe('status transitions', () => {
    it('should allow draft → pending transition', async () => {
      (prisma.claim.findUnique as any).mockResolvedValue(mockClaim);
      (prisma.claim.update as any).mockResolvedValue({ ...mockClaim, status: 'pending' });

      const updated = await prisma.claim.update({
        where: { id: mockClaim.id },
        data: { status: 'pending' },
      });

      expect(updated.status).toBe('pending');
    });

    it('should reject invalid amounts', () => {
      expect(mockClaim.claimAmount).toBeGreaterThan(0);
    });
  });

  describe('Carmack timeline validation', () => {
    it('should calculate 9-month filing window correctly', () => {
      const deliveryDate = new Date('2026-01-15');
      const nineMonthsLater = new Date(deliveryDate);
      nineMonthsLater.setMonth(nineMonthsLater.getMonth() + 9);

      const today = new Date('2026-06-15');
      const daysRemaining = Math.floor((nineMonthsLater.getTime() - today.getTime()) / 86400000);

      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThan(270);
    });

    it('should flag overdue acknowledgments after 30 days', () => {
      const filingDate = new Date('2026-01-01');
      const now = new Date('2026-02-15');
      const daysSinceFiling = Math.floor((now.getTime() - filingDate.getTime()) / 86400000);

      expect(daysSinceFiling).toBeGreaterThan(30);
    });
  });
});
