/**
 * Chatbot Routes - AI-powered claims intake chatbot
 *
 * Semi-public: message endpoint accepts unauthenticated users but
 * validates all input. Conversation history requires a valid sessionId.
 */
import { Router } from 'express';
import { prisma } from '../config/database';
import { v4 as uuid } from 'uuid';
import { chat } from '../services/agents/gemini-client';
import type { GeminiMessage } from '../services/agents/gemini-client';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const chatbotRouter: Router = Router();

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { success: false, error: 'Too many messages. Please wait a moment.' },
});

chatbotRouter.use(chatLimiter);

const CHATBOT_SYSTEM = `You are FreightClaims AI Assistant, a helpful chatbot for FreightClaims.com — the leading freight claims management platform.

You help with:
1. Answering questions about freight claims process and the FreightClaims.com PLATFORM
2. Explaining Carmack Amendment protections
3. Guiding users through platform features and navigation
4. Explaining document requirements for different claim types
5. General freight industry questions

CRITICAL: Always answer the user's ACTUAL question. If they ask how to delete something, tell them how to delete. If they ask how to edit, tell them how to edit. Do NOT answer a different question.

PLATFORM NAVIGATION:
- Dashboard: /claims — overview of metrics and compliance alerts
- Claims List: /claims/list — view, search, filter all claims. Create with "+ New Claim"
- Delete a claim: Open the claim → click the three-dot/actions menu → select "Delete"
- AI Entry: /ai-entry — create claims from documents or emails using AI
- Companies: /companies — manage customers, carriers, suppliers
- Shipments: /shipments — track shipments
- Documents: /documents — view and upload documents
- Reports: /reports/export — generate and export reports
- Settings: /settings — profile, notifications, email configuration, security
- User Management: /settings/users — manage users (admin only)

Be helpful, concise, and professional. If you don't know something, say so.

Document requirements by claim type:
- Damage: BOL, POD with damage noted, photos, product invoice, repair estimate
- Shortage: BOL, POD with shortage noted, product invoice
- Loss: BOL, product invoice, proof of non-delivery
- Concealed damage: BOL, POD, photos, product invoice, inspection report (within 15 days)

Key deadlines (Carmack Amendment, 49 USC 14706):
- File claim within 9 months of delivery
- Carrier must acknowledge within 30 days
- Carrier must provide disposition within 120 days`;

const FAQ: Record<string, string> = {
  'hi': 'Hello! I\'m here to help with freight claims. You can ask about filing claims, document requirements, Carmack Amendment protections, claim status, or anything else related to freight claims management.',
  'hello': 'Hello! I\'m here to help with freight claims. You can ask about filing claims, document requirements, Carmack Amendment protections, claim status, or anything else related to freight claims management.',
  'how do i file a claim': 'To file a freight claim:\n\n1. Click "+ New Claim" in the top right\n2. Enter the PRO number and claim type (damage, shortage, loss, etc.)\n3. Add shipment parties (customer, carrier)\n4. Add products/commodities with quantities and values\n5. Upload supporting documents (BOL, POD, photos, invoices)\n6. Review and submit\n\nUnder the Carmack Amendment (49 USC 14706), you have 9 months from delivery to file a claim.',
  'document requirements': 'Required documents vary by claim type:\n\n**Damage:** BOL, POD with damage noted, damage photos, product invoice, repair estimate\n**Shortage:** BOL, POD with shortage noted, product invoice, packing list\n**Loss:** BOL, product invoice, proof of non-delivery\n**Concealed Damage:** BOL, POD, photos, invoice, inspection report (within 15 days of delivery)\n**Theft:** BOL, invoice, police report\n\nAlways include the original Bill of Lading and a product invoice with every claim.',
  'carmack amendment': 'The Carmack Amendment (49 USC 14706) is the federal law governing carrier liability for freight claims in interstate commerce.\n\n**Key points:**\n- Carriers are liable for damage/loss during transit\n- You must file within 9 months of delivery\n- Carrier must acknowledge within 30 days\n- Carrier must provide disposition within 120 days\n- If denied, you have 2 years to file a lawsuit\n\nThe shipper must prove: (1) goods were in good condition when tendered, (2) goods arrived damaged/short, and (3) the amount of damages.',
};

function getFallbackResponse(msg: string): string {
  const lower = msg.toLowerCase().trim();

  // Exact FAQ matches first
  for (const [key, val] of Object.entries(FAQ)) {
    if (lower === key || lower === key + '?') return val;
  }

  // Platform action questions — check these BEFORE generic keyword matching
  if (lower.includes('delete') && lower.includes('claim')) return 'To delete a claim, open the claim detail page, click the three-dot menu or actions dropdown, and select "Delete Claim." Note: only admins and managers can delete claims. Deleted claims cannot be recovered.';
  if (lower.includes('edit') && lower.includes('claim')) return 'To edit a claim, go to the Claims List (/claims/list), click on the claim you want to modify, then click the "Edit" button or pencil icon to update its details.';
  if (lower.includes('export')) return 'To export claims data, go to Reports (/reports/export). You can filter by date range, status, and claim type, then export to CSV or PDF.';
  if (lower.includes('upload') && lower.includes('document')) return 'To upload documents, open the claim, go to the Documents tab, and click "Upload." You can also use Mass Upload (/mass-upload) to upload documents for multiple claims at once.';
  if (lower.includes('user') && (lower.includes('add') || lower.includes('invite') || lower.includes('create'))) return 'To add a user, go to User Management (/settings/users) and click "Invite User." Enter their email, name, and role. They\'ll receive an invitation email.';

  // Topic-specific matches
  if (lower.includes('file') && (lower.includes('claim') || lower.includes('submit'))) return FAQ['how do i file a claim'];
  if (lower.includes('document') || lower.includes('photo') || lower.includes('bol') || lower.includes('pod')) return FAQ['document requirements'];
  if (lower.includes('carmack') || lower.includes('law') || lower.includes('deadline') || lower.includes('liability')) return FAQ['carmack amendment'];
  if (lower.includes('damage')) return 'For damage claims, you\'ll need: Bill of Lading, Proof of Delivery with damage noted, damage photos, product invoice, and a repair estimate if applicable. File within 9 months of delivery. Go to "+ New Claim" to get started.';
  if (lower.includes('shortage') || lower.includes('short')) return 'For shortage claims, you\'ll need: Bill of Lading, Proof of Delivery with shortage noted, product invoice, and packing list. Note the shortage on the delivery receipt at the time of delivery.';
  if (lower.includes('loss') || lower.includes('lost') || lower.includes('missing')) return 'For loss claims, you\'ll need: Bill of Lading, product invoice, and proof of non-delivery. The carrier has the burden to prove delivery was made.';
  if (lower.includes('status') || lower.includes('update')) return 'You can check your claim status on the Claims List page. Claims go through these stages: Draft → Pending → In Review → Approved/Denied → Settlement → Closed. Click on any claim to see its full history and timeline.';
  if (lower.includes('help') || lower.includes('support')) return 'I can help with:\n• Filing claims\n• Document requirements\n• Carmack Amendment questions\n• Platform navigation\n• General freight claims guidance\n\nFor account-specific issues, visit Settings or contact support@freightclaims.com.';
  return 'I can help you with freight claims questions! Try asking about:\n• How to file a claim\n• How to delete or edit a claim\n• Document requirements\n• Carmack Amendment protections\n• Claim deadlines\n• Platform navigation\n\nOr click "+ New Claim" to get started filing a claim right away.';
}

chatbotRouter.post('/message', async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: 'message must be under 2000 characters' });
    }

    const sid = (typeof sessionId === 'string' && sessionId.length > 0) ? sessionId : uuid();

    let conversation = await prisma.chatConversation.findFirst({ where: { sessionId: sid } });
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: { sessionId: sid, channel: 'web' },
      });
    }

    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: message.trim() },
    });

    let response: string;

    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      const history = await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const messages: GeminiMessage[] = history.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      try {
        response = await chat(messages, {
          systemInstruction: CHATBOT_SYSTEM,
          config: { temperature: 0.7, maxOutputTokens: 1024 },
        });
      } catch (geminiErr: any) {
        const errDetail = geminiErr?.message || String(geminiErr);
        logger.error({ err: geminiErr, errDetail, keyLen: env.GEMINI_API_KEY?.length }, 'Gemini chat call failed — using fallback');
        response = getFallbackResponse(message.trim());
      }
    } else {
      response = getFallbackResponse(message.trim());
    }

    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: 'assistant', content: response },
    });

    res.json({
      success: true,
      data: { sessionId: sid, conversationId: conversation.id, message: response },
    });
  } catch (err) { next(err); }
});

chatbotRouter.get('/conversation/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId.length > 100) {
      return res.status(400).json({ success: false, error: 'Invalid sessionId' });
    }

    const conversation = await prisma.chatConversation.findFirst({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, data: conversation });
  } catch (err) { next(err); }
});

chatbotRouter.post('/conversation/:sessionId/resolve', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });

    const conversation = await prisma.chatConversation.updateMany({
      where: { sessionId },
      data: { status: 'resolved' },
    });
    res.json({ success: true, data: conversation });
  } catch (err) { next(err); }
});
