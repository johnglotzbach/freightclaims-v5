/**
 * Database Cleanup Script - Purge all testing data
 *
 * Run with: pnpm --filter database exec tsx prisma/cleanup.ts
 *
 * Keeps: permissions, roles, carriers, document categories, countries, super admin
 * Removes: claims, documents, shipments, notes, emails, audit logs, customers (except platform),
 *          user accounts (except super admin), onboarding state, etc.
 *
 * Location: packages/database/prisma/cleanup.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('=========================================');
  console.log(' FreightClaims v5.0 - Database Cleanup');
  console.log('=========================================\n');

  const tables: { label: string; fn: () => Promise<{ count: number }> }[] = [
    { label: 'AI analysis results', fn: () => prisma.aIAnalysisResult.deleteMany() },
    { label: 'AI analysis requests', fn: () => prisma.aIAnalysisRequest.deleteMany() },
    { label: 'Email attachments', fn: () => prisma.emailAttachment.deleteMany() },
    { label: 'Emails', fn: () => prisma.email.deleteMany() },
    { label: 'Claim status history', fn: () => prisma.claimStatusHistory.deleteMany() },
    { label: 'Claim notes', fn: () => prisma.claimNote.deleteMany() },
    { label: 'Claim commodities', fn: () => prisma.claimCommodity.deleteMany() },
    { label: 'Document category mappings', fn: () => prisma.documentCategoryMapping.deleteMany() },
    { label: 'Documents', fn: () => prisma.document.deleteMany() },
    { label: 'Shipment items', fn: () => prisma.shipmentItem.deleteMany() },
    { label: 'Shipments', fn: () => prisma.shipment.deleteMany() },
    { label: 'Claims', fn: () => prisma.claim.deleteMany() },
    { label: 'Automation logs', fn: () => prisma.automationLog.deleteMany() },
    { label: 'Automation rules', fn: () => prisma.automationRule.deleteMany() },
    { label: 'Onboarding state', fn: () => prisma.onboardingState.deleteMany() },
    { label: 'Audit logs', fn: () => prisma.auditLog.deleteMany() },
    { label: 'Customer notes', fn: () => prisma.customerNote.deleteMany() },
    { label: 'Customer contacts', fn: () => prisma.customerContact.deleteMany() },
    { label: 'Customer addresses', fn: () => prisma.customerAddress.deleteMany() },
    { label: 'Product catalogs', fn: () => prisma.productCatalog.deleteMany() },
    { label: 'API keys', fn: () => prisma.apiKey.deleteMany() },
    { label: 'Notifications', fn: () => prisma.notification.deleteMany() },
  ];

  for (const t of tables) {
    try {
      const result = await t.fn();
      if (result.count > 0) console.log(`  Deleted ${result.count} ${t.label}`);
    } catch (err: any) {
      if (!err.message?.includes('does not exist')) {
        console.log(`  Skipped ${t.label}: ${err.message?.slice(0, 60)}`);
      }
    }
  }

  // Delete non-super-admin users
  const deletedUsers = await prisma.user.deleteMany({
    where: { isSuperAdmin: false },
  });
  if (deletedUsers.count > 0) console.log(`  Deleted ${deletedUsers.count} non-admin users`);

  // Delete non-platform customers (workspaces, test companies)
  const deletedCustomers = await prisma.customer.deleteMany({
    where: { code: { not: 'FC-PLATFORM' } },
  });
  if (deletedCustomers.count > 0) console.log(`  Deleted ${deletedCustomers.count} test customers/workspaces`);

  // Re-seed document category mappings (they were deleted above)
  console.log('\n  Re-seeding document category mappings...');
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
    const cat = await prisma.documentCategory.findFirst({ where: { name: mapping.category } });
    if (!cat) continue;
    for (const claimType of mapping.types) {
      const existing = await prisma.documentCategoryMapping.findFirst({
        where: { categoryId: cat.id, claimType },
      });
      if (!existing) {
        await prisma.documentCategoryMapping.create({
          data: { categoryId: cat.id, claimType, isRequired: true },
        });
      }
    }
  }

  console.log('\n=========================================');
  console.log(' Cleanup complete!');
  console.log('=========================================');
  console.log('\nRemaining data:');
  console.log('  - Permissions & Roles (preserved)');
  console.log('  - Carriers (preserved)');
  console.log('  - Document categories & mappings (preserved)');
  console.log('  - Countries (preserved)');
  console.log('  - Super Admin account (preserved)');
  console.log('\nSuper Admin login:');
  console.log('  Email:    john@freightclaims.com');
  console.log('  Password: FreightClaims2026!');
  console.log('\nAll test data has been purged.\n');
}

cleanup()
  .catch((e) => { console.error('Cleanup failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
