/**
 * Production Reset & Seed Script (ESM)
 * 
 * Clears ALL test data and creates clean accounts.
 * Run: node prisma/reset-and-seed.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FreightClaims v5.0 — Production Reset ===\n');

  console.log('Step 1: Clearing all existing data...');

  const tables = [
    'aiAgentRun', 'aiDocument', 'chatMessage', 'chatConversation',
    'chatbotMessage', 'chatbotConversation',
    'claimPrediction', 'carrierRiskScore', 'fraudFlag',
    'claimPayment', 'claimTask', 'claimComment', 'claimTimeline',
    'claimParty', 'claimProduct', 'claimIdentifier',
    'claimDocument', 'claimStatusHistory',
    'claim',
    'shipmentContact', 'shipment',
    'documentCategoryMapping', 'documentCategory',
    'automationRuleAction', 'automationRuleCondition', 'automationRule', 'automationTemplate',
    'insuranceCertificate', 'carrierTariff', 'releaseValueTable', 'contract',
    'emailTemplate', 'emailLog', 'emailConfig',
    'notification',
    'newsPost', 'newsCategory', 'subscriber',
    'onboardingState',
    'customerNote', 'customerAddress', 'customerContact', 'productCatalog',
    'carrierContact', 'carrier',
    'supplierAddress', 'supplier', 'insuranceCompanyContact', 'insuranceCompany',
    'activityLog', 'claimSetting',
    'rolePermission',
    'user',
    'role', 'permission',
    'customer', 'country',
  ];

  for (const table of tables) {
    try {
      await prisma[table].deleteMany({});
      console.log(`  Cleared ${table}`);
    } catch {
      // Table might not exist
    }
  }

  console.log('  All data cleared.\n');

  console.log('Step 2: Creating permissions...');
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

  const permissions = {};
  for (const p of permissionDefs) {
    const perm = await prisma.permission.create({ data: p });
    permissions[p.name] = perm.id;
  }
  console.log(`  ${permissionDefs.length} permissions created`);

  console.log('Step 3: Creating roles...');
  const superAdminRole = await prisma.role.create({
    data: { name: 'Super Admin', description: 'FreightClaims platform administrator', allPermissions: true, allClaims: true },
  });
  const adminRole = await prisma.role.create({
    data: { name: 'Admin', description: 'Full access within the organization', allPermissions: true, allClaims: true },
  });
  const managerRole = await prisma.role.create({
    data: { name: 'Manager', description: 'Manage claims, users, and reports' },
  });
  const handlerRole = await prisma.role.create({
    data: { name: 'Claims Handler', description: 'Process and manage claims' },
  });
  const customerRole = await prisma.role.create({
    data: { name: 'Customer', description: 'View and manage own claims' },
  });
  const viewerRole = await prisma.role.create({
    data: { name: 'Viewer', description: 'Read-only access' },
  });

  const managerPerms = ['claims.view', 'claims.create', 'claims.edit', 'claims.export', 'documents.view', 'documents.upload', 'customers.view', 'customers.manage', 'shipments.view', 'shipments.manage', 'reports.view', 'reports.export', 'ai.copilot', 'ai.agents', 'settings.view', 'users.view', 'email.view', 'email.send', 'email.templates', 'automation.view'];
  for (const pName of managerPerms) {
    if (permissions[pName]) await prisma.rolePermission.create({ data: { roleId: managerRole.id, permissionId: permissions[pName], isView: true, isEdit: true } });
  }

  const handlerPerms = ['claims.view', 'claims.create', 'claims.edit', 'documents.view', 'documents.upload', 'customers.view', 'shipments.view', 'reports.view', 'ai.copilot', 'email.view', 'email.send'];
  for (const pName of handlerPerms) {
    if (permissions[pName]) await prisma.rolePermission.create({ data: { roleId: handlerRole.id, permissionId: permissions[pName], isView: true, isEdit: true } });
  }

  const customerPerms = ['claims.view', 'claims.create', 'documents.view', 'documents.upload', 'shipments.view', 'reports.view', 'ai.copilot'];
  for (const pName of customerPerms) {
    if (permissions[pName]) await prisma.rolePermission.create({ data: { roleId: customerRole.id, permissionId: permissions[pName], isView: true, isEdit: false } });
  }

  const viewerPerms = ['claims.view', 'documents.view', 'customers.view', 'shipments.view', 'reports.view'];
  for (const pName of viewerPerms) {
    if (permissions[pName]) await prisma.rolePermission.create({ data: { roleId: viewerRole.id, permissionId: permissions[pName], isView: true, isEdit: false } });
  }

  console.log('  6 roles created with permissions');

  console.log('Step 4: Creating corporate tenant...');
  const corpCustomer = await prisma.customer.create({
    data: { name: 'FreightClaims Platform', code: 'FC-PLATFORM', email: 'admin@freightclaims.com', isCorporate: true, isActive: true },
  });

  console.log('Step 5: Creating demo customer company...');
  const demoCustomer = await prisma.customer.create({
    data: { name: 'Acme Logistics Inc', code: 'ACME-001', email: 'info@acmelogistics.com', phone: '(555) 100-2000', isCorporate: false, isActive: true, corporateId: corpCustomer.id },
  });

  console.log('Step 6: Creating user accounts...');
  const superAdminHash = await bcrypt.hash('FreightClaims2026!', 12);
  const superAdmin = await prisma.user.create({
    data: { email: 'john@freightclaims.com', passwordHash: superAdminHash, firstName: 'John', lastName: 'Glotzbach', roleId: superAdminRole.id, corporateId: corpCustomer.id, isSuperAdmin: true },
  });

  const customerHash = await bcrypt.hash('Customer2026!', 12);
  const customerUser = await prisma.user.create({
    data: { email: 'customer@demo.com', passwordHash: customerHash, firstName: 'Sarah', lastName: 'Johnson', roleId: customerRole.id, corporateId: corpCustomer.id, customerId: demoCustomer.id, isSuperAdmin: false },
  });

  console.log(`  Super Admin: john@freightclaims.com (ID: ${superAdmin.id})`);
  console.log(`  Customer:    customer@demo.com (ID: ${customerUser.id})`);

  console.log('Step 7: Creating carriers...');
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
    await prisma.carrier.create({ data: c });
  }
  console.log(`  ${carriers.length} carriers created`);

  console.log('Step 8: Creating document categories...');
  const categoryDefs = ['Bill of Lading', 'Proof of Delivery', 'Invoice', 'Damage Photos', 'Inspection Report', 'Carrier Response', 'Settlement', 'Correspondence', 'Packing List', 'Police Report', 'Delivery Receipt'];
  const catIds = {};
  for (const name of categoryDefs) {
    const cat = await prisma.documentCategory.create({ data: { name } });
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
      await prisma.documentCategoryMapping.create({ data: { categoryId: catIds[mapping.category], claimType, isRequired: true } });
    }
  }
  console.log('  Document categories and required mappings created');

  for (const c of [{ name: 'United States', code: 'US' }, { name: 'Canada', code: 'CA' }, { name: 'Mexico', code: 'MX' }]) {
    await prisma.country.create({ data: c });
  }

  console.log('\n========================================');
  console.log('  FreightClaims v5.0 — Database Ready!');
  console.log('========================================');
  console.log('\n  Super Admin:');
  console.log('    Email:    john@freightclaims.com');
  console.log('    Password: FreightClaims2026!');
  console.log('\n  Customer Account:');
  console.log('    Email:    customer@demo.com');
  console.log('    Password: Customer2026!');
  console.log('    Company:  Acme Logistics Inc');
  console.log('\n  15 carriers, 11 doc categories, 6 roles, 26 permissions\n');
}

main()
  .catch((e) => { console.error('Reset failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
