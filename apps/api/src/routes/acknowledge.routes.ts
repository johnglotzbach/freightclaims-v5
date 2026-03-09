import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const acknowledgeRouter: Router = Router();

interface AckTokenPayload {
  claimId: string;
  partyId: string | null;
  type: string;
}

acknowledgeRouter.get('/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, env.JWT_SECRET) as AckTokenPayload;
    if (decoded.type !== 'acknowledgment') {
      return res.status(400).json({ success: false, error: 'Invalid token type' });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: decoded.claimId },
      select: {
        id: true,
        claimNumber: true,
        filingDate: true,
        claimAmount: true,
        description: true,
        claimType: true,
        status: true,
        parties: {
          where: { type: 'carrier' },
          select: { id: true, name: true, carrierClaimNumber: true },
        },
      },
    });

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const carrierParty = decoded.partyId
      ? claim.parties.find((p) => p.id === decoded.partyId)
      : claim.parties[0];

    res.json({
      success: true,
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        filingDate: claim.filingDate,
        claimAmount: Number(claim.claimAmount),
        description: claim.description,
        claimType: claim.claimType,
        status: claim.status,
        carrierName: carrierParty?.name || 'N/A',
        carrierPartyId: carrierParty?.id || null,
      },
    });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ success: false, error: 'This acknowledgment link has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, error: 'Invalid acknowledgment link' });
    }
    logger.error({ err }, 'Acknowledge GET error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

acknowledgeRouter.post('/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, env.JWT_SECRET) as AckTokenPayload;
    if (decoded.type !== 'acknowledgment') {
      return res.status(400).json({ success: false, error: 'Invalid token type' });
    }

    const { carrierClaimNumber, contactName, contactEmail, notes } = req.body;

    const claim = await prisma.claim.findUnique({
      where: { id: decoded.claimId },
      include: { parties: { where: { type: 'carrier' } } },
    });

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const partyId = decoded.partyId || claim.parties[0]?.id;

    if (partyId) {
      await prisma.claimParty.update({
        where: { id: partyId },
        data: {
          carrierClaimNumber: carrierClaimNumber || undefined,
          acknowledgedDate: new Date(),
          carrierResponse: notes || undefined,
        },
      });
    }

    await prisma.claim.update({
      where: { id: decoded.claimId },
      data: { acknowledgmentDate: new Date() },
    });

    await prisma.claimTimeline.create({
      data: {
        claimId: decoded.claimId,
        status: 'acknowledged',
        description: `Carrier acknowledged claim${contactName ? ` (${contactName})` : ''}${carrierClaimNumber ? ` — Carrier ref: ${carrierClaimNumber}` : ''}`,
        changedById: claim.createdById,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'carrier_acknowledgment',
        entity: 'claim',
        entityId: decoded.claimId,
        metadata: { carrierClaimNumber, contactName, contactEmail, notes },
      },
    }).catch(() => {});

    res.json({ success: true, message: 'Acknowledgment received. Thank you.' });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ success: false, error: 'This acknowledgment link has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, error: 'Invalid acknowledgment link' });
    }
    logger.error({ err }, 'Acknowledge POST error');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
