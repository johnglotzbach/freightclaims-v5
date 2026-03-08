/**
 * Database Seed Script - Permissions, roles, and initial accounts
 *
 * Run with: pnpm --filter database exec tsx prisma/seed.ts
 * Idempotent — uses upsert / findOrCreate. Safe to run multiple times.
 *
 * Location: packages/database/prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FreightClaims v5.0 database...\n');

  // ================================================================
  // PERMISSIONS
  // ================================================================
  console.log('Creating permissions...');
  const permissionDefs = [
    { name: 'claims.view', description: 'View claims list and details', module: 'claims', category: 'Claim Management' },
    { name: 'claims.create', description: 'Create new claims', module: 'claims', category: 'Claim Management' },
    { name: 'claims.edit', description: 'Edit claim details and status', module: 'claims', category: 'Claim Management' },
    { name: 'claims.delete', description: 'Delete/archive claims', module: 'claims', category: 'Claim Management' },
    { name: 'claims.export', description: 'Export claims to Excel/CSV', module: 'claims', category: 'Claim Management' },
    { name: 'documents.view', description: 'View claim documents', module: 'documents', category: 'Documents' },
    { name: 'documents.upload', description: 'Upload documents to claims', module: 'documents', category: 'Documents' },
    { name: 'documents.delete', description: 'Delete documents', module: 'documents', category: 'Documents' },
    { name: 'customers.view', description: 'View customer list and details', module: 'customers', category: 'Customers' },
    { name: 'customers.manage', description: 'Create/edit/delete customers', module: 'customers', category: 'Customers' },
    { name: 'shipments.view', description: 'View shipments', module: 'shipments', category: 'Shipments' },
    { name: 'shipments.manage', description: 'Create/edit shipments', module: 'shipments', category: 'Shipments' },
    { name: 'reports.view', description: 'View reports and insights', module: 'reports', category: 'Reports & Analytics' },
    { name: 'reports.export', description: 'Export report data', module: 'reports', category: 'Reports & Analytics' },
    { name: 'ai.copilot', description: 'Use AI copilot chat', module: 'ai', category: 'AI Features' },
    { name: 'ai.agents', description: 'Run AI agents on claims', module: 'ai', category: 'AI Features' },
    { name: 'settings.view', description: 'View settings', module: 'settings', category: 'Administration' },
    { name: 'settings.manage', description: 'Manage system settings', module: 'settings', category: 'Administration' },
    { name: 'users.view', description: 'View user list', module: 'admin', category: 'Administration' },
    { name: 'users.manage', description: 'Create/edit/delete users', module: 'admin', category: 'Administration' },
    { name: 'roles.manage', description: 'Manage roles and permissions', module: 'admin', category: 'Administration' },
    { name: 'email.view', description: 'View email logs', module: 'email', category: 'Communications' },
    { name: 'email.send', description: 'Send emails from claims', module: 'email', category: 'Communications' },
    { name: 'email.templates', description: 'Manage email templates', module: 'email', category: 'Communications' },
    { name: 'automation.view', description: 'View automation rules', module: 'automation', category: 'Automation' },
    { name: 'automation.manage', description: 'Create/edit automation rules', module: 'automation', category: 'Automation' },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description, module: p.module, category: p.category },
      create: p,
    });
    permissions[p.name] = perm.id;
  }
  console.log(`  ${permissionDefs.length} permissions created`);

  // ================================================================
  // ROLES
  // ================================================================
  console.log('Creating roles...');

  async function findOrCreateRole(name: string, description: string, opts: { allPermissions?: boolean; allClaims?: boolean } = {}) {
    let role = await prisma.role.findFirst({ where: { name, corporateId: null } });
    if (!role) {
      role = await prisma.role.create({ data: { name, description, allPermissions: opts.allPermissions ?? false, allClaims: opts.allClaims ?? false } });
    } else {
      role = await prisma.role.update({ where: { id: role.id }, data: { allPermissions: opts.allPermissions ?? role.allPermissions, allClaims: opts.allClaims ?? role.allClaims } });
    }
    return role;
  }

  const superAdminRole = await findOrCreateRole('Super Admin', 'FreightClaims platform administrator', { allPermissions: true, allClaims: true });
  const adminRole = await findOrCreateRole('Admin', 'Full access within the organization', { allPermissions: true, allClaims: true });
  const managerRole = await findOrCreateRole('Manager', 'Manage claims, users, and reports');

  const managerPerms = [
    'claims.view', 'claims.create', 'claims.edit', 'claims.export',
    'documents.view', 'documents.upload',
    'customers.view', 'customers.manage',
    'shipments.view', 'shipments.manage',
    'reports.view', 'reports.export',
    'ai.copilot', 'ai.agents',
    'settings.view', 'users.view',
    'email.view', 'email.send', 'email.templates',
    'automation.view',
  ];
  for (const pName of managerPerms) {
    if (permissions[pName]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: permissions[pName] } },
        update: { isView: true, isEdit: true },
        create: { roleId: managerRole.id, permissionId: permissions[pName], isView: true, isEdit: true },
      });
    }
  }

  const handlerRole = await findOrCreateRole('Claims Handler', 'Process and manage claims');
  const handlerPerms = [
    'claims.view', 'claims.create', 'claims.edit',
    'documents.view', 'documents.upload',
    'customers.view', 'shipments.view',
    'reports.view', 'ai.copilot',
    'email.view', 'email.send',
  ];
  for (const pName of handlerPerms) {
    if (permissions[pName]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: handlerRole.id, permissionId: permissions[pName] } },
        update: { isView: true, isEdit: true },
        create: { roleId: handlerRole.id, permissionId: permissions[pName], isView: true, isEdit: true },
      });
    }
  }

  const viewerRole = await findOrCreateRole('Viewer', 'Read-only access');
  const viewerPerms = ['claims.view', 'documents.view', 'customers.view', 'shipments.view', 'reports.view'];
  for (const pName of viewerPerms) {
    if (permissions[pName]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: permissions[pName] } },
        update: { isView: true, isEdit: false },
        create: { roleId: viewerRole.id, permissionId: permissions[pName], isView: true, isEdit: false },
      });
    }
  }
  console.log('  5 roles created with permissions');

  // ================================================================
  // CORPORATE TENANT (Platform)
  // ================================================================
  console.log('Creating corporate tenant...');
  const corpCustomer = await prisma.customer.upsert({
    where: { code: 'FC-PLATFORM' },
    update: {},
    create: {
      name: 'FreightClaims Platform',
      code: 'FC-PLATFORM',
      email: 'admin@freightclaims.com',
      isCorporate: true,
      isActive: true,
    },
  });

  // ================================================================
  // SUPER ADMIN ACCOUNT (Platform Owner)
  // ================================================================
  console.log('Creating super admin account...');
  const ownerHash = await bcrypt.hash('FreightClaims2026!', 12);
  await prisma.user.upsert({
    where: { email: 'john@freightclaims.com' },
    update: { roleId: superAdminRole.id, isSuperAdmin: true, corporateId: corpCustomer.id },
    create: {
      email: 'john@freightclaims.com',
      passwordHash: ownerHash,
      firstName: 'John',
      lastName: 'Glotzbach',
      roleId: superAdminRole.id,
      corporateId: corpCustomer.id,
      isSuperAdmin: true,
    },
  });
  console.log('  Super Admin: john@freightclaims.com');

  // ================================================================
  // CARRIERS
  // ================================================================
  console.log('Creating carriers...');
  const carriers = [
    { name: 'Southeastern Freight Lines', scacCode: 'SEFL' },
    { name: 'XPO Logistics', scacCode: 'XPOL' },
    { name: 'Old Dominion Freight Line', scacCode: 'ODFL' },
    { name: 'FedEx Freight', scacCode: 'FXFE' },
    { name: 'Estes Express Lines', scacCode: 'EXLA' },
    { name: 'ABF Freight', scacCode: 'ABFS' },
    { name: 'Saia Inc', scacCode: 'SAIA' },
    { name: 'R+L Carriers', scacCode: 'RLCA' },
    { name: 'YRC Freight', scacCode: 'RDWY' },
    { name: 'AAA Cooper Transportation', scacCode: 'AACT' },
    { name: 'Dayton Freight Lines', scacCode: 'DAFG' },
    { name: 'Holland Motor Express', scacCode: 'HMES' },
    { name: 'Central Transport LLC', scacCode: 'CENX' },
    { name: 'UPS Freight', scacCode: 'UPGF' },
    { name: 'TForce Freight', scacCode: 'TFIN' },
  ];
  for (const c of carriers) {
    await prisma.carrier.upsert({ where: { scacCode: c.scacCode }, update: {}, create: c });
  }
  console.log(`  ${carriers.length} carriers created`);

  // ================================================================
  // DOCUMENT CATEGORIES + REQUIRED MAPPINGS
  // ================================================================
  console.log('Creating document categories...');
  const categoryDefs = [
    'Bill of Lading', 'Proof of Delivery', 'Invoice', 'Damage Photos',
    'Inspection Report', 'Carrier Response', 'Settlement', 'Correspondence',
    'Packing List', 'Police Report', 'Delivery Receipt',
  ];
  const catIds: Record<string, string> = {};
  for (const name of categoryDefs) {
    const cat = await prisma.documentCategory.upsert({ where: { name }, update: {}, create: { name } });
    catIds[name] = cat.id;
  }

  const requiredMappings = [
    { category: 'Bill of Lading', types: ['damage', 'shortage', 'loss', 'concealed_damage', 'refused', 'theft'] },
    { category: 'Proof of Delivery', types: ['damage', 'shortage', 'loss', 'concealed_damage', 'refused'] },
    { category: 'Invoice', types: ['damage', 'shortage', 'loss', 'concealed_damage', 'refused', 'theft'] },
    { category: 'Damage Photos', types: ['damage', 'concealed_damage'] },
    { category: 'Inspection Report', types: ['damage', 'concealed_damage'] },
    { category: 'Packing List', types: ['shortage'] },
    { category: 'Police Report', types: ['theft'] },
    { category: 'Delivery Receipt', types: ['shortage', 'refused'] },
  ];
  for (const mapping of requiredMappings) {
    for (const claimType of mapping.types) {
      const existing = await prisma.documentCategoryMapping.findFirst({
        where: { categoryId: catIds[mapping.category], claimType },
      });
      if (!existing) {
        await prisma.documentCategoryMapping.create({
          data: { categoryId: catIds[mapping.category], claimType, isRequired: true },
        });
      }
    }
  }
  console.log('  Document categories and required mappings created');

  // ================================================================
  // COUNTRIES
  // ================================================================
  const countries = [
    { name: 'United States', code: 'US' },
    { name: 'Canada', code: 'CA' },
    { name: 'Mexico', code: 'MX' },
  ];
  for (const c of countries) {
    await prisma.country.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // ================================================================
  // NEWS CATEGORIES
  // ================================================================
  console.log('Creating news categories...');
  const newsCategories = [
    { name: 'Announcement', slug: 'announcement', color: '#3B82F6' },
    { name: 'New Feature', slug: 'feature', color: '#8B5CF6' },
    { name: 'Bug Fix', slug: 'bugfix', color: '#EF4444' },
    { name: 'Improvement', slug: 'improvement', color: '#10B981' },
  ];
  for (const nc of newsCategories) {
    await prisma.newsCategory.upsert({ where: { slug: nc.slug }, update: {}, create: nc });
  }
  console.log(`  ${newsCategories.length} news categories created`);

  // ================================================================
  // DONE
  // ================================================================
  console.log('\n========================================');
  console.log(' Seed completed successfully!');
  console.log('========================================');
  console.log('\nSuper Admin login:');
  console.log('  Email:    john@freightclaims.com');
  console.log('  Password: FreightClaims2026!');
  console.log('\nThe database is clean. Create customer accounts');
  console.log('through the app at Settings > Users.\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
