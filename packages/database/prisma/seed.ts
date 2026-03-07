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

  const superAdminRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Super Admin', corporateId: null as any } },
    update: { allPermissions: true, allClaims: true },
    create: { name: 'Super Admin', description: 'FreightClaims platform administrator', allPermissions: true, allClaims: true },
  });

  const adminRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Admin', corporateId: null as any } },
    update: { allPermissions: true, allClaims: true },
    create: { name: 'Admin', description: 'Full access within the organization', allPermissions: true, allClaims: true },
  });

  const managerRole = await prisma.role.upsert({
    where: { name_corporateId: { name: 'Manager', corporateId: null as any } },
    update: {},
    create: { name: 'Manager', description: 'Manage claims, users, and reports' },
  });

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
  // ACME FREIGHT SOLUTIONS (Demo Company)
  // ================================================================
  console.log('Creating demo company (Acme Freight Solutions)...');
  const acmeCustomer = await prisma.customer.upsert({
    where: { code: 'ACME-001' },
    update: { corporateId: corpCustomer.id },
    create: {
      name: 'Acme Freight Solutions',
      code: 'ACME-001',
      email: 'info@acmefreight.com',
      phone: '(555) 100-2000',
      industry: 'Third Party Logistics',
      corporateId: corpCustomer.id,
    },
  });

  // ================================================================
  // USERS
  // ================================================================
  console.log('Creating users...');

  // Owner account — John Glotzbach (Super Admin)
  const ownerHash = await bcrypt.hash('FreightClaims2026!', 12);
  const ownerUser = await prisma.user.upsert({
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

  // Test account — Claims Handler
  const testHash = await bcrypt.hash('TestUser2026!', 12);
  await prisma.user.upsert({
    where: { email: 'test@freightclaims.com' },
    update: { roleId: handlerRole.id, corporateId: corpCustomer.id, customerId: acmeCustomer.id },
    create: {
      email: 'test@freightclaims.com',
      passwordHash: testHash,
      firstName: 'Test',
      lastName: 'User',
      roleId: handlerRole.id,
      corporateId: corpCustomer.id,
      customerId: acmeCustomer.id,
    },
  });

  // Admin account
  const adminHash = await bcrypt.hash('admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@freightclaims.com' },
    update: { roleId: superAdminRole.id, isSuperAdmin: true, corporateId: corpCustomer.id },
    create: {
      email: 'admin@freightclaims.com',
      passwordHash: adminHash,
      firstName: 'System',
      lastName: 'Admin',
      roleId: superAdminRole.id,
      corporateId: corpCustomer.id,
      isSuperAdmin: true,
    },
  });

  // Demo account
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

  console.log('  4 user accounts created');

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
  // SAMPLE CLAIMS
  // ================================================================
  console.log('Creating sample claims...');

  const sampleClaims = [
    {
      claimNumber: 'CLM-2026-0001',
      status: 'pending',
      claimType: 'damage',
      claimAmount: 4250.00,
      description: 'Pallet of electronics damaged during transit - visible crush damage on delivery',
      proNumber: 'PRO-8847291',
      filingDate: new Date('2026-01-08'),
      deliveryDate: new Date('2026-01-01'),
      shipDate: new Date('2025-12-28'),
    },
    {
      claimNumber: 'CLM-2026-0002',
      status: 'in_review',
      claimType: 'shortage',
      claimAmount: 1875.50,
      description: 'Short 3 cases of product - BOL shows 12 cases, only 9 received',
      proNumber: 'PRO-9921034',
      filingDate: new Date('2026-01-15'),
      deliveryDate: new Date('2026-01-08'),
      shipDate: new Date('2026-01-04'),
    },
    {
      claimNumber: 'CLM-2026-0003',
      status: 'approved',
      claimType: 'loss',
      claimAmount: 12400.00,
      description: 'Entire shipment lost in transit - never delivered',
      proNumber: 'PRO-7734562',
      filingDate: new Date('2026-01-22'),
      deliveryDate: new Date('2026-01-15'),
      shipDate: new Date('2026-01-10'),
    },
    {
      claimNumber: 'CLM-2026-0004',
      status: 'denied',
      claimType: 'damage',
      claimAmount: 890.25,
      description: 'Water damage to carton of paper goods',
      proNumber: 'PRO-3348901',
      filingDate: new Date('2026-01-28'),
      deliveryDate: new Date('2026-01-21'),
      shipDate: new Date('2026-01-17'),
    },
    {
      claimNumber: 'CLM-2026-0005',
      status: 'pending',
      claimType: 'concealed_damage',
      claimAmount: 6750.00,
      description: 'Concealed damage found upon unpacking - internal items crushed',
      proNumber: 'PRO-5561278',
      filingDate: new Date('2026-02-03'),
      deliveryDate: new Date('2026-01-27'),
      shipDate: new Date('2026-01-23'),
    },
    {
      claimNumber: 'CLM-2026-0006',
      status: 'in_review',
      claimType: 'refused',
      claimAmount: 3200.00,
      description: 'Delivery refused - shipment arrived damaged and leaking',
      proNumber: 'PRO-2290145',
      filingDate: new Date('2026-02-10'),
      deliveryDate: new Date('2026-02-03'),
      shipDate: new Date('2026-01-30'),
    },
    {
      claimNumber: 'CLM-2026-0007',
      status: 'settled',
      claimType: 'damage',
      claimAmount: 8500.00,
      settledAmount: 7200.00,
      description: 'Forklift damage during unloading at destination',
      proNumber: 'PRO-6678432',
      filingDate: new Date('2026-02-14'),
      deliveryDate: new Date('2026-02-07'),
      shipDate: new Date('2026-02-03'),
    },
    {
      claimNumber: 'CLM-2026-0008',
      status: 'pending',
      claimType: 'shortage',
      claimAmount: 2100.00,
      description: 'Missing 1 pallet from multi-stop shipment',
      proNumber: 'PRO-4412987',
      filingDate: new Date('2026-02-20'),
      deliveryDate: new Date('2026-02-13'),
      shipDate: new Date('2026-02-09'),
    },
  ];

  for (const claim of sampleClaims) {
    await prisma.claim.upsert({
      where: { claimNumber: claim.claimNumber },
      update: {
        status: claim.status,
        claimType: claim.claimType,
        claimAmount: claim.claimAmount,
        settledAmount: claim.settledAmount ?? null,
        description: claim.description,
      },
      create: {
        claimNumber: claim.claimNumber,
        proNumber: claim.proNumber,
        status: claim.status,
        claimType: claim.claimType,
        claimAmount: claim.claimAmount,
        settledAmount: claim.settledAmount ?? null,
        description: claim.description,
        shipDate: claim.shipDate,
        deliveryDate: claim.deliveryDate,
        filingDate: claim.filingDate,
        createdById: ownerUser.id,
        customerId: acmeCustomer.id,
        corporateId: corpCustomer.id,
      },
    });
  }
  console.log(`  ${sampleClaims.length} sample claims created`);

  // ================================================================
  // SAMPLE SHIPMENTS
  // ================================================================
  console.log('Creating sample shipments...');

  const sampleShipments = [
    { proNumber: 'SHP-2026-001', originCity: 'Atlanta', originState: 'GA', destinationCity: 'Dallas', destinationState: 'TX', weight: 4500, pieces: 12, shipDate: new Date('2026-01-05'), deliveryDate: new Date('2026-01-08') },
    { proNumber: 'SHP-2026-002', originCity: 'Chicago', originState: 'IL', destinationCity: 'Los Angeles', destinationState: 'CA', weight: 8200, pieces: 24, shipDate: new Date('2026-01-12'), deliveryDate: new Date('2026-01-18') },
    { proNumber: 'SHP-2026-003', originCity: 'New York', originState: 'NY', destinationCity: 'Miami', destinationState: 'FL', weight: 3100, pieces: 8, shipDate: new Date('2026-01-20'), deliveryDate: new Date('2026-01-24') },
    { proNumber: 'SHP-2026-004', originCity: 'Seattle', originState: 'WA', destinationCity: 'Phoenix', destinationState: 'AZ', weight: 6800, pieces: 16, shipDate: new Date('2026-02-01'), deliveryDate: new Date('2026-02-05') },
    { proNumber: 'SHP-2026-005', originCity: 'Houston', originState: 'TX', destinationCity: 'Nashville', destinationState: 'TN', weight: 2400, pieces: 6, shipDate: new Date('2026-02-10'), deliveryDate: new Date('2026-02-13') },
  ];

  for (const shipment of sampleShipments) {
    const existing = await prisma.shipment.findFirst({
      where: { proNumber: shipment.proNumber, corporateId: corpCustomer.id },
    });
    if (!existing) {
      await prisma.shipment.create({
        data: {
          proNumber: shipment.proNumber,
          originCity: shipment.originCity,
          originState: shipment.originState,
          destinationCity: shipment.destinationCity,
          destinationState: shipment.destinationState,
          weight: shipment.weight,
          pieces: shipment.pieces,
          shipDate: shipment.shipDate,
          deliveryDate: shipment.deliveryDate,
          customerId: acmeCustomer.id,
          corporateId: corpCustomer.id,
        },
      });
    }
  }
  console.log(`  ${sampleShipments.length} sample shipments created`);

  // ================================================================
  // SEED COMPLETE
  // ================================================================
  console.log('\n========================================');
  console.log(' Seed completed successfully!');
  console.log('========================================');
  console.log('\nLogin accounts:');
  console.log('  Owner:  john@freightclaims.com / FreightClaims2026!');
  console.log('  Test:   test@freightclaims.com / TestUser2026!');
  console.log('  Admin:  admin@freightclaims.com / admin123!');
  console.log('  Demo:   demo@freightclaims.com / demo123!');
  console.log('');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
