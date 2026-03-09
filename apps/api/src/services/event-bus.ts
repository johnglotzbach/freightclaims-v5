import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

class AppEventBus extends EventEmitter {
  emit(event: string, ...args: any[]): boolean {
    logger.debug({ event, argCount: args.length }, 'Event emitted');
    return super.emit(event, ...args);
  }
}

export const eventBus = new AppEventBus();
eventBus.setMaxListeners(50);

export const Events = {
  CLAIM_CREATED: 'claim.created',
  CLAIM_UPDATED: 'claim.updated',
  CLAIM_STATUS_CHANGED: 'claim.statusChanged',
  CLAIM_FILED: 'claim.filed',
  DOCUMENT_UPLOADED: 'document.uploaded',
  TASK_OVERDUE: 'task.overdue',
  TASK_COMPLETED: 'task.completed',
  EMAIL_RECEIVED: 'email.received',
  EMAIL_SENT: 'email.sent',
  USER_INVITED: 'user.invited',
} as const;
