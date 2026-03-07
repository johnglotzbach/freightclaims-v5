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

export const chatbotRouter: Router = Router();

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { success: false, error: 'Too many messages. Please wait a moment.' },
});

chatbotRouter.use(chatLimiter);

const CHATBOT_SYSTEM = `You are FreightClaims AI Assistant, a helpful chatbot for FreightClaims.com — the leading freight claims management platform.

You help with:
1. Answering questions about freight claims process
2. Explaining Carmack Amendment protections
3. Guiding users through claim filing
4. Providing status updates (when authenticated)
5. Explaining document requirements for different claim types
6. General freight industry questions

Be helpful, concise, and professional. If you don't know something, say so.
When discussing claims process, reference the Carmack Amendment (49 USC 14706) where relevant.

Document requirements by claim type:
- Damage: BOL, POD with damage noted, photos, product invoice, repair estimate
- Shortage: BOL, POD with shortage noted, product invoice
- Loss: BOL, product invoice, proof of non-delivery
- Concealed damage: BOL, POD, photos, product invoice, inspection report (within 15 days)

Key deadlines:
- File claim within 9 months of delivery
- Carrier must acknowledge within 30 days
- Carrier must provide disposition within 120 days`;

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

    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const messages: GeminiMessage[] = history.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await chat(messages, {
      systemInstruction: CHATBOT_SYSTEM,
      config: { temperature: 0.7, maxOutputTokens: 1024 },
    });

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
