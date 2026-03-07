/**
 * Database Seed Script - Initial data including permissions, roles, and sample data
 *
 * Run with: pnpm db:seed (from root) or pnpm seed (from this package)
 * Idempotent — uses upsert operations. Safe to run multiple times.
 *
 * Location: packages/database/prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FreightClaims v5.0 database...\n');

  // ================================================================
  // PERMISSIONS - Granular module-level permissions
  // ================================================================
  console.log('Creating permissions...');
  const permissionDefs = [
    // Claims
    { name: 'claims.view', description: 'View claims list and details', module: 'claims', category: 'Claim Management' },
    { name: 'claims.create', description: 'Create new claims', module: 'claims', category: 'Claim Management' },
    { name: 'claims.edit', description: 'Edit claim details and status', module: 'claims', category: 'Claim Management' },
    { name: 'claims.delete', description: 'Delete/archive claims', module: 'claims', category: 'Claim Management' },
    { name: 'claims.export', description: 'Export claims to Excel/CSV', module: 'claims', category: 'Claim Management' },
    // Documents
    { name: 'documents.view', description: 'View claim documents', module: 'documents', category: 'Documents' },
    { name: 'documents.upload', description: 'Upload documents to claims', module: 'documents', category: 'Documents' },
    { name: 'documents.delete', description: 'Delete documents', module: 'documents', category: 'Documents' },
    // Customers
    { name: 'customers.view', description: 'View customer list and details', module: 'customers', category: 'Customers' },
    { name: 'customers.manage', description: 'Create/edit/delete customers', module: 'customers', category: 'Customers' },
    // Shipments
    { name: 'shipments.view', description: 'View shipments', module: 'shipments', category: 'Shipments' },
    { name: 'shipments.manage', description: 'Create/edit shipments', module: 'shipments', category: 'Shipments' },
    // Reports
    { name: 'reports.view', description: 'View reports and insights', module: 'reports', category: 'Reports & Analytics' },
    { name: 'reports.export', description: 'Export report data', module: 'reports', category: 'Reports & Analytics' },
    // AI
    { name: 'ai.copilot', description: 'Use AI copilot chat', module: 'ai', category: 'AI Features' },
    { name: 'ai.agents', description: 'Run AI agents on claims', module: 'ai', category: 'AI Features' },
    // Settings & Admin
    { name: 'settings.view', description: 'View settings', module: 'settings', category: 'Administration' },
    { name: 'settings.manage', description: 'Manage system settings', module: 'settings', category: 'Administration' },
    { name: 'users.view', description: 'View user list', module: 'admin', category: 'Administration' },
    { name: 'users.manage', description: 'Create/edit/delete users', module: 'admin', category: 'Administration' },
    { name: 'roles.manage', description: 'Manage roles and permissions', module: 'admin', category: 'Administration' },
    // Email
    { name: 'email.view', description: 'View email logs', module: 'email', category: 'Communications' },
    { name: 'email.send', description: 'Send emails from claims', module: 'email', category: 'Communications' },
    { name: 'email.templates', description: 'Manage email templates', module: 'email', category: 'Communications' },
    // Automation
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
  // ROLES - Default roles with permission assignments
  // ================================================================
  console.log('Creating roles...');

  // Super Admin role (global, not tenant-scoped)
  const superAdminRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Super Admin', corporateId: null as any } },
    update: { allPermissions: true, allClaims: true },
    create: { name: 'Super Admin', description: 'FreightClaims platform administrator', allPermissions: true, allClaims: true },
  });

  // Admin role (tenant-scoped, full access within tenant)
  const adminRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Admin', corporateId: null as any } },
    update: { allPermissions: true, allClaims: true },
    create: { name: 'Admin', description: 'Full access within the organization', allPermissions: true, allClaims: true },
  });

  // Manager role
  const managerRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Manager', corporateId: null as any } },
    update: {},
    create: { name: 'Manager', description: 'Manage claims, users, and reports' },
  });

  // Assign manager permissions
  const managerPerms = [
    'claims.view', 'claims.create', 'claims.edit', 'claims.export',
    'documents.view', 'documents.upload',
    'customers.view', 'customers.manage',
    'shipments.view', 'shipments.manage',
    'reports.view', 'reports.export',
    'ai.copilot', 'ai.agents',
    'settings.view',
    'users.view',
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

  // Claims Handler role
  const handlerRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Claims Handler', corporateId: null as any } },
    update: {},
    create: { name: 'Claims Handler', description: 'Process and manage claims' },
  });

  const handlerPerms = [
    'claims.view', 'claims.create', 'claims.edit',
    'documents.view', 'documents.upload',
    'customers.view',
    'shipments.view',
    'reports.view',
    'ai.copilot',
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

  // Viewer role
  const viewerRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Viewer', corporateId: null as any } },
    update: {},
    create: { name: 'Viewer', description: 'Read-only access' },
  });

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
  // CORPORATE CUSTOMER (Tenant)
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

  // Demo customer under the platform
  const demoCustomer = await prisma.customer.upsert({
    where: { code: 'DEMO-001' },
    update: { corporateId: corpCustomer.id },
    create: {
      name: 'Demo Logistics Corp',
      code: 'DEMO-001',
      email: 'demo@demologistics.com',
      phone: '555-0100',
      industry: 'Logistics',
      corporateId: corpCustomer.id,
    },
  });

  // ================================================================
  // ADMIN USER
  // ================================================================
  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@freightclaims.com' },
    update: { roleId: superAdminRole.id, isSuperAdmin: true, corporateId: corpCustomer.id },
    create: {
      email: 'admin@freightclaims.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      roleId: superAdminRole.id,
      corporateId: corpCustomer.id,
      isSuperAdmin: true,
    },
  });

  // Demo user
  const demoHash = await bcrypt.hash('demo123!', 12);
  await prisma.user.upsert({
    where: { email: 'demo@freightclaims.com' },
    update: { roleId: handlerRole.id, corporateId: corpCustomer.id, customerId: demoCustomer.id },
    create: {
      email: 'demo@freightclaims.com',
      passwordHash: demoHash,
      firstName: 'Demo',
      lastName: 'User',
      roleId: handlerRole.id,
      corporateId: corpCustomer.id,
      customerId: demoCustomer.id,
    },
  });

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

  // Required documents per claim type
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

  console.log('\nSeed completed successfully!');
  console.log('  Login: admin@freightclaims.com / admin123!');
  console.log('  Demo:  demo@freightclaims.com / demo123!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
