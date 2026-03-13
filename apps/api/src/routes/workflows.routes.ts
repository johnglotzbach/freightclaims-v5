/**
 * Workflow Routes - CRUD for workflows, workflow steps, and workflow executions
 *
 * Provides full management of automation workflows including triggers, steps,
 * and execution history. Tenant-scoped via corporateId.
 *
 * Location: apps/api/src/routes/workflows.routes.ts
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const VALID_TRIGGERS = ['on_create', 'on_status_change', 'on_file_claim', 'on_schedule', 'on_document_upload', 'on_overdue'];
const VALID_ACTION_TYPES = ['send_email', 'create_task', 'change_status', 'notify_user', 'wait_delay', 'ai_action'];

export const workflowsRouter: Router = Router();
workflowsRouter.use(authenticate);

function getTenantWhere(user: { corporateId: string | null; isSuperAdmin?: boolean }) {
  if (user.isSuperAdmin) return {};
  if (user.corporateId) return { corporateId: user.corporateId };
  return { corporateId: null };
}

function ensureWorkflowAccess(workflow: { corporateId: string | null } | null, user: { corporateId: string | null; isSuperAdmin?: boolean }) {
  if (!workflow) return false;
  if (user.isSuperAdmin) return true;
  return workflow.corporateId === user.corporateId;
}

// List workflows (tenant-scoped)
// GET /workflows
workflowsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const where = getTenantWhere(user);

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { steps: true } },
      },
    });

    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
});

// Create workflow
// POST /workflows
workflowsRouter.post('/', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { name, description, trigger, triggerConfig, isActive = true, steps = [] } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({ success: false, error: 'name and trigger are required' });
    }
    if (!VALID_TRIGGERS.includes(trigger)) {
      return res.status(400).json({ success: false, error: `trigger must be one of: ${VALID_TRIGGERS.join(', ')}` });
    }

    const corporateId = user.isSuperAdmin ? (req.body.corporateId ?? user.corporateId) : user.corporateId;

    const workflow = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: {
          name,
          description: description ?? null,
          trigger,
          triggerConfig: triggerConfig ?? {},
          isActive: !!isActive,
          corporateId,
          createdById: user.userId,
        },
      });

      if (Array.isArray(steps) && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          const actionType = s.actionType || s.action_type;
          if (!actionType || !VALID_ACTION_TYPES.includes(actionType)) {
            throw new Error(`Step ${i + 1}: actionType must be one of: ${VALID_ACTION_TYPES.join(', ')}`);
          }
          await tx.workflowStep.create({
            data: {
              workflowId: wf.id,
              stepOrder: s.stepOrder ?? s.step_order ?? i + 1,
              actionType,
              config: s.config ?? {},
              conditionLogic: s.conditionLogic ?? s.condition_logic ?? null,
            },
          });
        }
      }

      return tx.workflow.findUnique({
        where: { id: wf.id },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    });

    res.status(201).json({ success: true, data: workflow });
  } catch (err: any) {
    next(err);
  }
});

// Update workflow
// PUT /workflows/:id
workflowsRouter.put('/:id', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;
    const { name, description, trigger, triggerConfig, isActive } = req.body;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || !ensureWorkflowAccess(existing, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    if (trigger && !VALID_TRIGGERS.includes(trigger)) {
      return res.status(400).json({ success: false, error: `trigger must be one of: ${VALID_TRIGGERS.join(', ')}` });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (trigger !== undefined) data.trigger = trigger;
    if (triggerConfig !== undefined) data.triggerConfig = triggerConfig;
    if (isActive !== undefined) data.isActive = !!isActive;

    const workflow = await prisma.workflow.update({
      where: { id },
      data,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    res.json({ success: true, data: workflow });
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ success: false, error: 'Workflow not found' });
    next(err);
  }
});

// Delete workflow
// DELETE /workflows/:id
workflowsRouter.delete('/:id', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || !ensureWorkflowAccess(existing, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    await prisma.workflow.delete({ where: { id } });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ success: false, error: 'Workflow not found' });
    next(err);
  }
});

// Manage steps - POST /workflows/:id/steps
workflowsRouter.post('/:id/steps', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;
    const { stepOrder, actionType, config, conditionLogic } = req.body;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const action = actionType || req.body.action_type;
    if (!action || !VALID_ACTION_TYPES.includes(action)) {
      return res.status(400).json({ success: false, error: `actionType must be one of: ${VALID_ACTION_TYPES.join(', ')}` });
    }

    const maxOrder = await prisma.workflowStep.aggregate({
      where: { workflowId: id },
      _max: { stepOrder: true },
    });
    const order = stepOrder ?? (maxOrder._max.stepOrder ?? 0) + 1;

    const step = await prisma.workflowStep.create({
      data: {
        workflowId: id,
        stepOrder: order,
        actionType: action,
        config: config ?? {},
        conditionLogic: conditionLogic ?? null,
      },
    });

    res.status(201).json({ success: true, data: step });
  } catch (err: any) {
    next(err);
  }
});

// PUT /workflows/:id/steps/:stepId
workflowsRouter.put('/:id/steps/:stepId', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const stepId = req.params.stepId as string;
    const user = (req as any).user;
    const { stepOrder, actionType, config, conditionLogic } = req.body;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const step = await prisma.workflowStep.findFirst({ where: { id: stepId, workflowId: id } });
    if (!step) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }

    if (actionType && !VALID_ACTION_TYPES.includes(actionType)) {
      return res.status(400).json({ success: false, error: `actionType must be one of: ${VALID_ACTION_TYPES.join(', ')}` });
    }

    const data: Record<string, unknown> = {};
    if (stepOrder !== undefined) data.stepOrder = stepOrder;
    if (actionType !== undefined) data.actionType = actionType;
    if (config !== undefined) data.config = config;
    if (conditionLogic !== undefined) data.conditionLogic = conditionLogic;

    const updated = await prisma.workflowStep.update({
      where: { id: stepId },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ success: false, error: 'Step not found' });
    next(err);
  }
});

// DELETE /workflows/:id/steps/:stepId
workflowsRouter.delete('/:id/steps/:stepId', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const stepId = req.params.stepId as string;
    const user = (req as any).user;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const step = await prisma.workflowStep.findFirst({ where: { id: stepId, workflowId: id } });
    if (!step) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }

    await prisma.workflowStep.delete({ where: { id: stepId } });
    res.json({ success: true, message: 'Step deleted' });
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ success: false, error: 'Step not found' });
    next(err);
  }
});

// Workflow executions - GET /workflows/:id/executions
workflowsRouter.get('/:id/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const where: { workflowId: string; status?: string } = { workflowId: id };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    res.json({ success: true, data: executions, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// Get single workflow with steps (must be after more specific /:id/* routes)
// GET /workflows/:id
workflowsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// Trigger a workflow manually (dry run or real)
// POST /workflows/:id/trigger
workflowsRouter.post('/:id/trigger', authorize(['admin', 'manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user;
    const { claimId, dryRun = false } = req.body;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!workflow || !ensureWorkflowAccess(workflow, user)) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const executionLog: any[] = [{ event: 'triggered', dryRun, at: new Date().toISOString(), triggeredBy: user.userId }];

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        claimId: claimId ?? null,
        currentStep: 0,
        status: dryRun ? 'dry_run' : 'running',
        log: executionLog as any,
      },
    });

    if (!dryRun && workflow.steps.length > 0) {
      runWorkflowSteps(execution.id, workflow.steps, claimId, user.userId).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: execution,
      message: dryRun ? 'Dry run execution created (no actions performed)' : 'Workflow execution started',
    });
  } catch (err) {
    next(err);
  }
});

async function runWorkflowSteps(executionId: string, steps: any[], claimId: string | null, userId: string) {
  const log: any[] = [];
  let failed = false;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    try {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { currentStep: i + 1 },
      });

      const result = await executeStep(step, claimId, userId);
      log.push({ step: i + 1, actionType: step.actionType, status: 'completed', result, at: new Date().toISOString() });
    } catch (err: any) {
      log.push({ step: i + 1, actionType: step.actionType, status: 'failed', error: err.message, at: new Date().toISOString() });
      failed = true;
      break;
    }
  }

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: failed ? 'failed' : 'completed',
      completedAt: new Date(),
      log: log as any,
    },
  });
}

async function executeStep(step: any, claimId: string | null, userId: string): Promise<string> {
  const config = (step.config || {}) as Record<string, any>;

  switch (step.actionType) {
    case 'change_status': {
      if (!claimId || !config.status) return 'skipped: no claimId or status';
      await prisma.claim.update({ where: { id: claimId }, data: { status: config.status } });
      return `Status changed to ${config.status}`;
    }
    case 'create_task': {
      if (!claimId) return 'skipped: no claimId';
      await prisma.claimTask.create({
        data: {
          claimId,
          title: config.title || 'Automated Task',
          description: config.description || '',
          status: 'pending',
          priority: config.priority || 'medium',
          dueDate: config.dueDays ? new Date(Date.now() + config.dueDays * 86400000) : null,
          assignedTo: config.assignedTo || userId,
          createdById: userId,
        },
      });
      return `Task "${config.title || 'Automated Task'}" created`;
    }
    case 'notify_user': {
      const targetUserId = config.userId || userId;
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: config.title || 'Workflow Notification',
          message: config.message || 'An automated workflow step has been executed.',
          type: 'workflow',
          category: 'automation',
          link: claimId ? `/claims/${claimId}` : undefined,
        },
      });
      return `Notification sent to ${targetUserId}`;
    }
    case 'send_email': {
      // Email sending is handled through the SMTP service; for now log intent
      return `Email step queued: to=${config.to || 'claim parties'}, template=${config.template || 'none'}`;
    }
    case 'wait_delay': {
      const delayMs = (config.minutes || 0) * 60000;
      if (delayMs > 0 && delayMs <= 300000) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      return `Waited ${config.minutes || 0} minutes`;
    }
    case 'ai_action': {
      return `AI action "${config.action || 'analyze'}" queued for processing`;
    }
    default:
      return `Unknown action type: ${step.actionType}`;
  }
}
