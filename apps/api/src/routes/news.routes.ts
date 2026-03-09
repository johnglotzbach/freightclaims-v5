/**
 * News Routes - Public news/newsletter system (replaces blog)
 *
 * Public endpoints for reading news. Authenticated endpoints for
 * creating/editing posts (requires admin permissions).
 */
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { newsSubscribeSchema } from '../validators/common.validators';

export const newsRouter: Router = Router();

// --- Public endpoints ---

newsRouter.get('/', async (req, res, next) => {
  try {
    const { category, page = '1', limit = '12', search } = req.query;
    const where: Record<string, unknown> = { status: 'published' };
    if (category) where.category = { slug: category as string };
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.newsPost.findMany({
        where: where as any,
        include: { category: true },
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      }),
      prisma.newsPost.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});

newsRouter.get('/categories', async (_req, res, next) => {
  try {
    const data = await prisma.newsCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

newsRouter.get('/post/:slug', async (req, res, next) => {
  try {
    const post = await prisma.newsPost.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });
    if (!post || post.status !== 'published') {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    await prisma.newsPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
});

// --- Newsletter subscription ---

newsRouter.post('/subscribe', validate(newsSubscribeSchema), async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const subscriber = await prisma.newsSubscriber.upsert({
      where: { email },
      update: { isActive: true, name, unsubscribedAt: null },
      create: { email, name },
    });
    res.status(201).json({ success: true, data: { id: subscriber.id } });
  } catch (err) { next(err); }
});

newsRouter.post('/unsubscribe', validate(newsSubscribeSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    await prisma.newsSubscriber.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Admin endpoints (authenticated) ---

newsRouter.use('/admin', authenticate, authorize(['admin']));

newsRouter.get('/admin/posts', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '25' } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status as string;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.newsPost.findMany({
        where: where as any,
        include: { category: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.newsPost.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});

newsRouter.post('/admin/posts', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { title, content, excerpt, categoryId, coverImage, status } = req.body;

    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    const post = await prisma.newsPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        categoryId,
        coverImage,
        authorId: user.userId,
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : undefined,
      },
      include: { category: true },
    });
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
});

newsRouter.put('/admin/posts/:id', async (req, res, next) => {
  try {
    const { title, content, excerpt, categoryId, coverImage, status, isPinned } = req.body;
    const existing = await prisma.newsPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Post not found' });

    const wasPublished = existing.status === 'published';
    const isPublishing = status === 'published' && !wasPublished;

    const post = await prisma.newsPost.update({
      where: { id: req.params.id },
      data: {
        title, content, excerpt, categoryId, coverImage, status, isPinned,
        publishedAt: isPublishing ? new Date() : undefined,
      },
      include: { category: true },
    });
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
});

newsRouter.delete('/admin/posts/:id', async (req, res, next) => {
  try {
    await prisma.newsPost.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// --- Admin: Categories ---

newsRouter.post('/admin/categories', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cat = await prisma.newsCategory.create({ data: { name, slug, color } });
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// --- Admin: Subscribers ---

newsRouter.get('/admin/subscribers', async (req, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.newsSubscriber.findMany({ skip, take: Number(limit), orderBy: { subscribedAt: 'desc' } }),
      prisma.newsSubscriber.count(),
    ]);
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
});
