/**
 * ReportsService - Analytics, insights, and report generation
 *
 * Location: apps/api/src/services/reports.service.ts
 */
import type { Response } from 'express';
import { reportsRepository } from '../repositories/reports.repository';
import type { JwtPayload } from '../middleware/auth.middleware';

export const reportsService = {
  async getDashboard(user: JwtPayload, overrideCorporateId?: string | null) {
    return reportsRepository.getDashboard(overrideCorporateId !== undefined ? overrideCorporateId : user.corporateId);
  },
  async getInsightsReport(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getInsightsReport(body, user.customerId ?? undefined); },
  async getTopCustomers(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getTopCustomers(body, user.customerId ?? undefined); },
  async getTopCarriers(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getTopCarriers(body, user.customerId ?? undefined); },
  async getCollectionPercentage(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getCollectionPercentage(body, user.customerId ?? undefined); },
  async getMetricsPerCarrier(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getMetricsPerCarrier(body, user.customerId ?? undefined); },
  async getMetricsPerDestination(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getMetricsPerDestination(body, user.customerId ?? undefined); },
  async getWriteOffAmount(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getWriteOffAmount(body, user.customerId ?? undefined); },
  async exportReport(reportType: string, format: string, query: Record<string, unknown>, user: JwtPayload, res: Response) {
    const result = await reportsRepository.exportReport(reportType, format, query, user.customerId ?? undefined);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  },
};
