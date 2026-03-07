/**
 * Onboarding Routes - User onboarding state and help center
 */
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';

export const onboardingRouter = Router();
onboardingRouter.use(authenticate);

// Get current user's onboarding state
onboardingRouter.get('/me', async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    let onboarding = await prisma.userOnboarding.findUnique({ where: { userId } });

    if (!onboarding) {
      onboarding = await prisma.userOnboarding.create({
        data: { userId, completedSteps: [], dismissedTours: [] },
      });
    }

    res.json({ success: true, data: onboarding });
  } catch (err) { next(err); }
});

// Update onboarding state
onboardingRouter.put('/me', async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const { completedSteps, dismissedTours, currentStep, profileCompleted, firstClaimFiled, emailConfigured, teamInvited, aiTested } = req.body;

    const data: Record<string, unknown> = {};
    if (completedSteps !== undefined) data.completedSteps = completedSteps;
    if (dismissedTours !== undefined) data.dismissedTours = dismissedTours;
    if (currentStep !== undefined) data.currentStep = currentStep;
    if (profileCompleted !== undefined) data.profileCompleted = profileCompleted;
    if (firstClaimFiled !== undefined) data.firstClaimFiled = firstClaimFiled;
    if (emailConfigured !== undefined) data.emailConfigured = emailConfigured;
    if (teamInvited !== undefined) data.teamInvited = teamInvited;
    if (aiTested !== undefined) data.aiTested = aiTested;

    // Check if all steps complete
    if (profileCompleted && firstClaimFiled && emailConfigured && teamInvited && aiTested) {
      data.completedAt = new Date();
    }

    const onboarding = await prisma.userOnboarding.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data, completedSteps: completedSteps || [], dismissedTours: dismissedTours || [] },
    });

    res.json({ success: true, data: onboarding });
  } catch (err) { next(err); }
});

// Complete a specific step
onboardingRouter.post('/me/complete-step', async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const { step } = req.body;

    let onboarding = await prisma.userOnboarding.findUnique({ where: { userId } });
    if (!onboarding) {
      onboarding = await prisma.userOnboarding.create({
        data: { userId, completedSteps: [step], dismissedTours: [] },
      });
    } else {
      const completed = (onboarding.completedSteps as string[]) || [];
      if (!completed.includes(step)) {
        completed.push(step);
        onboarding = await prisma.userOnboarding.update({
          where: { userId },
          data: { completedSteps: completed },
        });
      }
    }

    res.json({ success: true, data: onboarding });
  } catch (err) { next(err); }
});

// Dismiss a tour
onboardingRouter.post('/me/dismiss-tour', async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const { tour } = req.body;

    let onboarding = await prisma.userOnboarding.findUnique({ where: { userId } });
    if (!onboarding) {
      onboarding = await prisma.userOnboarding.create({
        data: { userId, completedSteps: [], dismissedTours: [tour] },
      });
    } else {
      const dismissed = (onboarding.dismissedTours as string[]) || [];
      if (!dismissed.includes(tour)) {
        dismissed.push(tour);
        onboarding = await prisma.userOnboarding.update({
          where: { userId },
          data: { dismissedTours: dismissed },
        });
      }
    }

    res.json({ success: true, data: onboarding });
  } catch (err) { next(err); }
});

// Reset onboarding (useful for testing)
onboardingRouter.post('/me/reset', async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const onboarding = await prisma.userOnboarding.upsert({
      where: { userId },
      update: {
        completedSteps: [],
        dismissedTours: [],
        currentStep: null,
        profileCompleted: false,
        firstClaimFiled: false,
        emailConfigured: false,
        teamInvited: false,
        aiTested: false,
        completedAt: null,
      },
      create: { userId, completedSteps: [], dismissedTours: [] },
    });
    res.json({ success: true, data: onboarding });
  } catch (err) { next(err); }
});
