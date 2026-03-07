/**
 * ReportsService - Analytics, insights, and report generation
 *
 * Location: apps/api/src/services/reports.service.ts
 */
import type { Response } from 'express';
import { reportsRepository } from '../repositories/reports.repository';
import type { JwtPayload } from '../middleware/auth.middleware';

export const reportsService = {
  async getInsightsReport(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getInsightsReport(body, user.customerId); },
  async getTopCustomers(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getTopCustomers(body, user.customerId); },
  async getTopCarriers(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getTopCarriers(body, user.customerId); },
  async getCollectionPercentage(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getCollectionPercentage(body, user.customerId); },
  async getMetricsPerCarrier(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getMetricsPerCarrier(body, user.customerId); },
  async getMetricsPerDestination(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getMetricsPerDestination(body, user.customerId); },
  async getWriteOffAmount(body: Record<string, unknown>, user: JwtPayload) { return reportsRepository.getWriteOffAmount(body, user.customerId); },
  async exportReport(type: string, query: Record<string, unknown>, user: JwtPayload, _res: Response) { return reportsRepository.exportReport(type, query, user.customerId); },
};
