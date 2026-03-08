/**
 * Intake Agent - Automated claim creation from documents and emails
 *
 * Takes raw input (email text, OCR'd documents, scanned BOLs, uploaded PDFs)
 * and extracts structured claim data: carrier, PRO number, shipper, consignee,
 * commodity, weights, and claimed amounts. Classifies document types, parses
 * email bodies for claim info, and can auto-create claims when confidence is
 * high enough.
 */
import { prisma } from '../../config/database';
import { generateJSON, generateContent } from './gemini-client';
import { executeTool } from './tools';
import type { BaseAgent, AgentContext, AgentResult } from './types';

const SYSTEM_PROMPT = `You are the FreightClaims Intake Agent. Your job is to extract structured claim data from unstructured inputs like emails, scanned documents, and user descriptions.

Extract these fields when present:
- Carrier name and SCAC code
- PRO number / tracking number
- BOL number
- PO numbers (array)
- Shipper name and address (street, city, state, zip)
- Consignee name and address (street, city, state, zip)
- Ship date and delivery date
- Date of loss (when damage/shortage was discovered)
- Commodity description, weight, pieces, NMFC code, freight class
- Claim type (damage, shortage, loss, concealed_damage, refused, theft)
- Claimed amount
- Description of damage or issue
- Insurance certificate number if referenced
- Any reference numbers

If a field cannot be determined, set it to null. Be conservative with amounts -- only include values explicitly stated in the source material.

For claim type, use these rules:
- "damage" = visible freight damage on delivery
- "shortage" = missing pieces or partial shipment
- "loss" = entire shipment lost/undelivered
- "concealed_damage" = damage discovered after delivery sign-off
- "refused" = consignee refused delivery
- "theft" = confirmed stolen freight`;

const DOC_CLASSIFICATION_PROMPT = `You are a freight document classifier. Given the text content of a document, classify it into one of these categories:
- bill_of_lading: BOL showing shipment details
- proof_of_delivery: POD or delivery receipt
- product_invoice: Commercial invoice showing product values
- damage_photos: Descriptions of damage photographs
- inspection_report: Third party inspection findings
- weight_certificate: Certified weight documentation
- packing_list: Itemized contents list
- correspondence: Letters or emails about the claim
- carrier_response: Carrier acknowledgment, denial, or settlement offer
- insurance_certificate: Insurance coverage documentation
- other: Anything that doesn't fit above

Return the category, a confidence score (0-1), and a brief reason.`;

export interface IntakeExtraction {
  carrierName: string | null;
  scacCode: string | null;
  proNumber: string | null;
  bolNumber: string | null;
  poNumbers: string[];
  shipperName: string | null;
  shipperAddress: string | null;
  shipperCity: string | null;
  shipperState: string | null;
  shipperZip: string | null;
  consigneeName: string | null;
  consigneeAddress: string | null;
  consigneeCity: string | null;
  consigneeState: string | null;
  consigneeZip: string | null;
  shipDate: string | null;
  deliveryDate: string | null;
  dateOfLoss: string | null;
  commodity: string | null;
  weight: number | null;
  pieces: number | null;
  nmfcCode: string | null;
  freightClass: string | null;
  claimType: string | null;
  claimedAmount: number | null;
  damageDescription: string | null;
  insuranceCertNumber: string | null;
  referenceNumbers: string[];
  confidence: number;
  missingFields: string[];
}

interface DocumentClassification {
  category: string;
  confidence: number;
  reason: string;
}

interface EmailParse {
  senderEmail: string | null;
  senderName: string | null;
  subject: string | null;
  claimReferences: string[];
  attachmentNames: string[];
  bodyText: string;
  intent: 'new_claim' | 'update' | 'response' | 'inquiry' | 'unknown';
}

/**
 * Classify a document based on its text content.
 */
async function classifyDocument(textContent: string): Promise<DocumentClassification> {
  return generateJSON<DocumentClassification>(
    `Classify this freight document:\n\n"""${textContent.slice(0, 4000)}"""\n\nReturn: { category, confidence (0-1), reason }`,
    { systemInstruction: DOC_CLASSIFICATION_PROMPT },
  );
}

/**
 * Parse an inbound email to extract claim-relevant info.
 */
async function parseEmail(emailBody: string, subject?: string, from?: string): Promise<EmailParse> {
  return generateJSON<EmailParse>(
    `Parse this freight claims email for relevant information.

From: ${from || 'unknown'}
Subject: ${subject || 'none'}

Body:
"""
${emailBody.slice(0, 6000)}
"""

Return: { senderEmail, senderName, subject, claimReferences (array of claim/PRO/BOL numbers found), attachmentNames, bodyText (cleaned), intent (new_claim|update|response|inquiry|unknown) }`,
    { systemInstruction: 'Extract all claim-relevant information from emails. Identify whether this is a new claim submission, an update to existing claim, a carrier response, or a general inquiry.' },
  );
}

/**
 * Check if a similar claim already exists to detect duplicates.
 */
async function checkDuplicates(extraction: IntakeExtraction): Promise<Array<{ claimId: string; claimNumber: string; matchScore: number }>> {
  if (!extraction.proNumber && !extraction.bolNumber) return [];

  const where: Record<string, unknown> = {};
  if (extraction.proNumber) {
    where.proNumber = { contains: extraction.proNumber, mode: 'insensitive' };
  }

  const existing = await prisma.claim.findMany({
    where: where as any,
    select: { id: true, claimNumber: true, proNumber: true, claimType: true, claimAmount: true },
    take: 5,
  });

  return existing.map((c: any) => ({
    claimId: c.id,
    claimNumber: c.claimNumber,
    matchScore: c.proNumber?.toLowerCase() === extraction.proNumber?.toLowerCase() ? 0.95 : 0.6,
  }));
}

/**
 * Auto-create a claim from the extraction when confidence is high enough.
 */
async function autoCreateClaim(
  extraction: IntakeExtraction,
  ctx: AgentContext,
): Promise<{ claimId: string; claimNumber: string } | null> {
  if (extraction.confidence < 0.8 || !extraction.proNumber || !extraction.claimType) {
    return null;
  }

  if (!ctx.customerId) return null;

  const claimNumber = `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const claim = await prisma.claim.create({
    data: {
      claimNumber,
      proNumber: extraction.proNumber,
      status: 'draft',
      claimType: extraction.claimType,
      claimAmount: extraction.claimedAmount || 0,
      description: extraction.damageDescription,
      shipDate: extraction.shipDate ? new Date(extraction.shipDate) : undefined,
      deliveryDate: extraction.deliveryDate ? new Date(extraction.deliveryDate) : undefined,
      customerId: ctx.customerId,
      createdById: ctx.userId,
      corporateId: ctx.corporateId || (ctx.input.corporateId as string) || undefined,
    },
  });

  // Create parties from extraction
  const parties = [];
  if (extraction.shipperName) {
    parties.push({
      claimId: claim.id,
      type: 'shipper',
      name: extraction.shipperName,
      address: extraction.shipperAddress,
      city: extraction.shipperCity,
      state: extraction.shipperState,
      zipCode: extraction.shipperZip,
    });
  }
  if (extraction.consigneeName) {
    parties.push({
      claimId: claim.id,
      type: 'consignee',
      name: extraction.consigneeName,
      address: extraction.consigneeAddress,
      city: extraction.consigneeCity,
      state: extraction.consigneeState,
      zipCode: extraction.consigneeZip,
    });
  }
  if (extraction.carrierName) {
    parties.push({
      claimId: claim.id,
      type: 'carrier',
      name: extraction.carrierName,
      scacCode: extraction.scacCode,
    });
  }

  if (parties.length > 0) {
    await prisma.claimParty.createMany({ data: parties });
  }

  // Create product entry if commodity info was extracted
  if (extraction.commodity) {
    await prisma.claimProduct.create({
      data: {
        claimId: claim.id,
        description: extraction.commodity,
        weight: extraction.weight,
        value: extraction.claimedAmount,
        quantity: extraction.pieces || 1,
        nmfcCode: extraction.nmfcCode,
        freightClass: extraction.freightClass,
      },
    });
  }

  // Create claim identifiers
  const identifiers = [];
  if (extraction.bolNumber) identifiers.push({ claimId: claim.id, type: 'bol', value: extraction.bolNumber });
  for (const po of extraction.poNumbers) {
    identifiers.push({ claimId: claim.id, type: 'po', value: po });
  }
  for (const ref of extraction.referenceNumbers) {
    identifiers.push({ claimId: claim.id, type: 'ref', value: ref });
  }
  if (identifiers.length > 0) {
    await prisma.claimIdentifier.createMany({ data: identifiers });
  }

  // Add timeline entry
  await prisma.claimTimeline.create({
    data: {
      claimId: claim.id,
      status: 'draft',
      description: `Claim auto-created by AI Intake Agent with ${Math.round(extraction.confidence * 100)}% confidence`,
      changedById: ctx.userId,
    },
  });

  return { claimId: claim.id, claimNumber };
}

export const intakeAgent: BaseAgent = {
  type: 'intake',
  name: 'Claim Intake Agent',
  description: 'Extracts structured claim data from emails, documents, and descriptions. Classifies documents, parses emails, detects duplicates, and auto-creates claims when confidence is high.',

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const results: Record<string, unknown> = {};

    // Determine input type and process accordingly
    const inputType = ctx.input.type as string || 'text';
    let rawInput = '';
    let emailData: EmailParse | null = null;
    let docClassification: DocumentClassification | null = null;

    if (inputType === 'email' || ctx.input.emailBody) {
      emailData = await parseEmail(
        ctx.input.emailBody as string || '',
        ctx.input.emailSubject as string,
        ctx.input.emailFrom as string,
      );
      rawInput = emailData.bodyText;
      results.emailParse = emailData;
    } else if (inputType === 'document' || ctx.input.documentText) {
      const docText = ctx.input.documentText as string || '';
      docClassification = await classifyDocument(docText);
      rawInput = docText;
      results.documentClassification = docClassification;

      // Save classification result
      if (ctx.input.documentId) {
        await prisma.aiDocument.create({
          data: {
            documentId: ctx.input.documentId as string,
            claimId: ctx.claimId,
            agentType: 'intake',
            extractedData: docClassification as any,
            confidence: docClassification.confidence,
            status: 'completed',
          },
        }).catch(() => {});
      }
    } else {
      rawInput = ctx.input.rawText as string || ctx.input.description as string || JSON.stringify(ctx.input);
    }

    // Batch classify multiple documents if provided
    if (ctx.input.documents && Array.isArray(ctx.input.documents)) {
      const classifications = await Promise.all(
        (ctx.input.documents as Array<{ id: string; text: string }>).map(async (doc) => {
          const cls = await classifyDocument(doc.text);
          return { documentId: doc.id, ...cls };
        }),
      );
      results.documentClassifications = classifications;

      // Combine all document text for extraction
      rawInput = (ctx.input.documents as Array<{ text: string }>).map((d) => d.text).join('\n\n---\n\n');
    }

    // Extract structured claim data
    const extraction = await generateJSON<IntakeExtraction>(
      `Extract freight claim data from the following input. Return JSON matching the IntakeExtraction schema.

Input:
"""
${rawInput.slice(0, 8000)}
"""

Return: { carrierName, scacCode, proNumber, bolNumber, poNumbers (array), shipperName, shipperAddress, shipperCity, shipperState, shipperZip, consigneeName, consigneeAddress, consigneeCity, consigneeState, consigneeZip, shipDate (ISO), deliveryDate (ISO), dateOfLoss (ISO), commodity, weight, pieces, nmfcCode, freightClass, claimType, claimedAmount, damageDescription, insuranceCertNumber, referenceNumbers (array), confidence (0-1), missingFields (array of field names that couldn't be extracted) }`,
      { systemInstruction: SYSTEM_PROMPT },
    );
    results.extraction = extraction;

    // Look up carrier if SCAC found
    let carrierData = null;
    if (extraction.scacCode) {
      const result = await executeTool('getCarrier', { scacCode: extraction.scacCode }, ctx);
      if (result.success) carrierData = result.data;
    }
    results.carrier = carrierData;

    // Check for duplicate claims
    const duplicates = await checkDuplicates(extraction);
    results.duplicates = duplicates;

    // Auto-create claim if confidence is high and no duplicates
    let createdClaim = null;
    if (ctx.input.autoCreate !== false && duplicates.length === 0) {
      createdClaim = await autoCreateClaim(extraction, ctx);
    }
    results.createdClaim = createdClaim;

    // Generate summary
    const { text: summary } = await generateContent(
      `Summarize this claim intake extraction in 2-3 sentences for a claims handler:
${JSON.stringify(extraction, null, 2)}
${carrierData ? `Carrier found in system: ${JSON.stringify(carrierData)}` : 'Carrier not found in system.'}
${duplicates.length > 0 ? `Potential duplicate claims found: ${duplicates.map((d) => d.claimNumber).join(', ')}` : ''}
${createdClaim ? `Auto-created claim: ${createdClaim.claimNumber}` : 'Claim not auto-created (needs manual review).'}`,
      { systemInstruction: 'Write a brief professional summary. Mention any missing required fields, duplicates, and whether a claim was created.' },
    );

    const needsDocs = extraction.missingFields.length > 3 || extraction.confidence < 0.6;

    return {
      agentType: 'intake',
      status: 'completed',
      result: summary,
      structuredOutput: results,
      durationMs: Date.now() - start,
      nextAgent: needsDocs ? 'documents' : undefined,
      summary: `Extracted ${Object.values(extraction).filter((v) => v !== null && v !== undefined).length} fields with ${Math.round(extraction.confidence * 100)}% confidence${createdClaim ? ` — created claim ${createdClaim.claimNumber}` : ''}${duplicates.length > 0 ? ` — ${duplicates.length} potential duplicate(s)` : ''}`,
    };
  },
};
