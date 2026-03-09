'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  HelpCircle, Search, Rocket, ClipboardList, FileUp, Sparkles,
  BarChart3, UserCog, ChevronRight, ChevronDown, ExternalLink,
  MessageCircle, BookOpen, FileText, Eye, FolderOpen, BotMessageSquare,
  BrainCircuit, TrendingUp, PieChart, Download, User, Users, ShieldCheck,
} from 'lucide-react';

interface Article {
  title: string;
  icon: React.ElementType;
  content: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  articles: Article[];
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    description: 'New to FreightClaims? Start here to learn the basics.',
    articles: [
      {
        title: 'How to File a New Claim',
        icon: FileText,
        content: `Filing a new freight claim is straightforward with the step-by-step claim creation wizard.

**Step 1 — Select Claim Type**
From the sidebar, navigate to Claims > New Claim. You'll be asked to select a claim type: Damage, Shortage, Loss, Concealed Damage, Refused, or Theft. Each type has specific document requirements, which the system will guide you through.

**Step 2 — Enter Shipment Details**
Provide the PRO number, BOL number, shipment date, delivery date, and origin/destination information. If you have a tracking number or reference number, add those as well. The system will attempt to auto-fill carrier details based on the PRO number.

**Step 3 — Add Parties**
Add the shipper, consignee, and carrier involved in the claim. You can search your existing contacts database or add new parties on the fly. Each party's role and contact information helps streamline communication later.

**Step 4 — Specify Claim Amount**
Enter the claimed amount, including product value, freight charges (if applicable), and any other costs. Attach the product invoice to support the amount.

**Step 5 — Upload Documents**
Upload required documents such as the Bill of Lading (BOL), Proof of Delivery (POD), photos of damage, and invoices. The system will tell you which documents are required vs. optional for your claim type.

**Step 6 — Review & Submit**
Review all entered information, then submit the claim. It will be assigned a unique claim number and enter the "Pending" status. You'll receive a confirmation email with the claim details.

**Pro tip:** Use the AI Entry feature (Claims > AI Entry) to upload your documents first and let the AI automatically extract shipment details, saving you time on data entry.`,
      },
      {
        title: 'Understanding Claim Statuses',
        icon: ClipboardList,
        content: `Every claim moves through a lifecycle of statuses. Here's what each one means:

**Pending**
The claim has been created and is waiting for initial review. All required documents should be uploaded at this stage. No action has been taken by the claims team yet.

**In Review**
A claims analyst is actively reviewing the claim details, verifying documents, and assessing the validity. They may request additional documentation or clarification during this stage.

**Approved**
The claim has been reviewed and determined to be valid. It is now ready to be filed with the carrier. The approved amount may differ from the original claimed amount based on the review findings.

**Denied**
The claim did not meet the requirements for approval. Common reasons include insufficient documentation, filing past the deadline, or the claim type not being covered. You can view the denial reason on the claim detail page and may choose to appeal.

**Settled**
The carrier has agreed to pay on the claim. The settlement amount, date, and payment details are recorded. This is a terminal status — the claim has been resolved with a payment.

**Closed**
The claim has been closed without a settlement. This can happen when a claim is withdrawn, written off, or administratively closed. The reason for closure is noted on the claim record.

Each status change is logged in the claim's timeline, so you always have a full audit trail of what happened and when.`,
      },
      {
        title: 'Navigating the Dashboard',
        icon: PieChart,
        content: `The main dashboard gives you a bird's-eye view of your claims portfolio.

**Header & Quick Actions**
At the top, you'll find quick action buttons to create a new claim or ask the AI assistant. The header also shows your organization name and user menu.

**Sidebar Navigation**
The left sidebar is your primary navigation. Key sections include:
• **Claims** — Dashboard, claims list, new claim, mass upload
• **Documents** — All uploaded documents across claims
• **Companies** — Carriers, customers, suppliers, contacts, locations
• **Reports** — Analytics, custom reports, data exports
• **AI** — AI tools including risk analysis, fraud detection, and outcome prediction
• **Settings** — Profile, user management, roles, templates
• **Help** — You are here!

**KPI Cards**
The top row shows key performance indicators: total claims, pending review count, settlement rate, and average settlement amount. Each card shows the trend compared to the previous period.

**Charts & Analytics**
Below the KPIs, interactive charts show monthly filing/settlement trends, claims by status (pie chart), claims by type (bar chart), and your top carriers by claim volume.

**Compliance Alerts**
A banner at the bottom highlights any claims approaching Carmack Amendment deadlines (30-day acknowledgment, 120-day disposition) so nothing falls through the cracks.`,
      },
    ],
  },
  {
    id: 'claims-management',
    title: 'Claims Management',
    icon: ClipboardList,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    description: 'Track, update, and manage your claims throughout their lifecycle.',
    articles: [
      {
        title: 'How to Track a Claim',
        icon: Search,
        content: `FreightClaims gives you multiple ways to find and track your claims.

**Claims List**
Navigate to Claims > Claims List to see all claims in a sortable, searchable table. The list shows claim number, claimant, carrier, status, amount, and dates at a glance.

**Search**
Use the search bar at the top of the claims list to search by claim number, PRO number, BOL number, carrier name, or claimant name. Results update instantly as you type.

**Filters**
Click the filter icon to narrow your view by:
• **Status** — Show only claims in specific statuses (e.g., Pending, In Review)
• **Claim Type** — Filter by Damage, Shortage, Loss, etc.
• **Carrier** — Show claims for a specific carrier
• **Date Range** — Filter by filing date, delivery date, or settlement date
• **Amount** — Filter by claim amount range
• **Assigned To** — See claims assigned to a specific team member

**Claim Detail View**
Click any claim to open its full detail page, which includes:
• Summary panel with key information
• Complete timeline of all activities and status changes
• Documents tab with all attached files
• Email/communication tab
• Notes section for internal team comments
• AI analysis results (if available)

**Notifications**
Set up notifications under Settings > Profile to receive email alerts when claims change status, when documents are uploaded, or when comments are added.`,
      },
      {
        title: 'Adding Documents to Claims',
        icon: FileUp,
        content: `Supporting documents are critical for successful claim resolution. Here's how to attach them.

**From the Claim Detail Page**
Open any claim and go to the Documents tab. Click "Upload Document" to add files. You'll be asked to classify the document type:
• **BOL (Bill of Lading)** — Required for all claim types
• **POD (Proof of Delivery)** — Required; should note any damage or shortage
• **Photos** — Required for damage and concealed damage claims
• **Product Invoice** — Required to support the claimed amount
• **Inspection Report** — Required for concealed damage (within 15 days)
• **Correspondence** — Emails, letters, or other communication
• **Other** — Any additional supporting documentation

**Drag & Drop**
You can drag and drop files directly onto the documents area. Multiple files can be uploaded simultaneously.

**From AI Entry**
Use the AI Entry feature to upload documents before creating a claim. The AI will read and classify the documents, extract data, and pre-fill claim fields for you.

**Supported Formats**
PDF, JPEG, PNG, TIFF, DOCX, and XLSX files are supported. Maximum file size is 25MB per file. Non-PDF files are automatically converted to PDF for consistent viewing and AI processing.`,
      },
      {
        title: 'Filing with a Carrier',
        icon: ExternalLink,
        content: `Once a claim is approved, you can use the filing workflow to formally submit it to the carrier.

**Starting the Filing Process**
From the claim detail page, click the "File with Carrier" button (available on approved claims). This opens the filing workflow.

**Step 1 — Verify Claim Information**
Review the claim details, amount, and all supporting documents. Ensure everything is accurate before submission.

**Step 2 — Select Filing Method**
Choose how to submit the claim to the carrier:
• **Email** — Send the claim package via email directly from FreightClaims
• **Carrier Portal** — Get a pre-formatted package to upload to the carrier's portal
• **Mail** — Generate a printable claim package for physical mailing

**Step 3 — Generate Claim Package**
The system compiles a formal claim letter, all supporting documents, and a summary into a single package. Review the generated documents before sending.

**Step 4 — Submit & Track**
Submit the claim and the system will record the filing date, method, and reference number. The claim status updates to reflect the filing. Follow-up reminders are automatically scheduled based on Carmack Amendment timelines.

**Automated Follow-ups**
The system tracks carrier response deadlines:
• 30 days for acknowledgment of receipt
• 120 days for disposition (approve/deny)
You'll receive alerts if the carrier misses these deadlines.`,
      },
      {
        title: 'Editing Claim Details',
        icon: FileText,
        content: `You can update claim information at any point during the claim lifecycle.

**Editing Basic Information**
From the claim detail page, click the "Edit" button on any section to modify:
• Shipment details (PRO number, dates, origin/destination)
• Claimed amount and line items
• Parties (add, remove, or update carrier, shipper, consignee)
• Claim type and description

**Adding Notes**
Use the Notes section on the claim detail page to add internal comments. Notes are visible to your team but are not included in carrier communications. Use notes to document investigation findings, phone call summaries, or next steps.

**Modifying Parties**
In the Parties section, you can:
• Add additional parties (e.g., a third-party logistics provider)
• Update contact information for existing parties
• Change the primary carrier if the claim was mis-routed

**Audit Trail**
Every edit is logged in the claim timeline with a timestamp and the user who made the change. This provides a complete audit trail for compliance and accountability.

**Locked Fields**
Some fields become read-only after certain status changes. For example, the claimed amount cannot be changed after a claim is settled. This ensures data integrity throughout the process.`,
      },
    ],
  },
  {
    id: 'documents-files',
    title: 'Documents & Files',
    icon: FileUp,
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    description: 'Upload, view, and organize your claim documents.',
    articles: [
      {
        title: 'Uploading Documents',
        icon: FileUp,
        content: `FreightClaims supports multiple ways to upload and manage documents.

**Supported File Types**
• **PDF** — Primary format for all documents; best for AI processing
• **JPEG / PNG** — Photos of damage, delivery conditions
• **TIFF** — High-resolution scanned documents
• **DOCX** — Word documents (correspondence, reports)
• **XLSX** — Spreadsheets (invoices, inventory lists)

**Auto-Conversion to PDF**
When you upload non-PDF files (images, Word docs, etc.), the system automatically converts them to PDF format. This ensures consistent viewing across the platform and enables AI text extraction on all documents.

**Size Limits**
• Maximum file size: 25MB per file
• No limit on number of files per claim
• Bulk upload supports up to 50 files at once

**Upload Methods**
1. **Claim Detail Page** — Upload directly to a specific claim
2. **AI Entry** — Upload documents for AI to process and create claims
3. **Mass Upload** — Upload document sets for multiple claims at once
4. **Drag & Drop** — Drag files anywhere on the claim page to upload

**Best Practices**
• Ensure photos are clear and well-lit with visible damage
• Upload the original BOL, not a copy when possible
• Include all pages of multi-page documents
• Name files descriptively (e.g., "BOL-PRO123456.pdf") for easy identification`,
      },
      {
        title: 'Viewing Documents',
        icon: Eye,
        content: `FreightClaims includes a built-in document viewer so you never need to leave the platform.

**Built-in PDF Viewer**
Click any document thumbnail or name to open it in the full-screen viewer. Features include:
• **Zoom** — Zoom in/out for detail inspection
• **Page Navigation** — Navigate multi-page documents with page controls
• **Rotate** — Rotate pages that were scanned sideways
• **Download** — Download the original file to your computer
• **Print** — Print directly from the viewer

**Side-by-Side View**
When reviewing a claim, you can open documents in a side panel while viewing claim details. This is especially useful when verifying information between the BOL and claim form.

**Document Preview**
In the documents list, hover over any document to see a quick thumbnail preview without opening the full viewer.

**AI Highlights**
When documents have been processed by the AI, extracted fields are highlighted in the viewer. Click a highlight to see what data was extracted and how it maps to the claim fields.`,
      },
      {
        title: 'Document Categories',
        icon: FolderOpen,
        content: `Documents are categorized to keep claims organized and ensure compliance requirements are met.

**Required Documents by Claim Type**

**Damage Claims:**
• Bill of Lading (BOL) — Required
• Proof of Delivery (POD) with damage noted — Required
• Photos of damage — Required
• Product invoice — Required
• Repair estimate (if applicable) — Recommended

**Shortage Claims:**
• Bill of Lading (BOL) — Required
• Proof of Delivery (POD) with shortage noted — Required
• Product invoice — Required
• Packing list — Recommended

**Loss Claims:**
• Bill of Lading (BOL) — Required
• Product invoice — Required
• Proof of non-delivery — Required
• Trace request results — Recommended

**Concealed Damage Claims:**
• Bill of Lading (BOL) — Required
• Proof of Delivery (POD) — Required
• Photos of damage — Required
• Product invoice — Required
• Inspection report (must be filed within 15 days) — Required

**Document Status Indicators**
Each claim shows a document completeness indicator:
• 🟢 **Complete** — All required documents uploaded
• 🟡 **Partial** — Some required documents missing
• 🔴 **Incomplete** — Critical documents missing

The system will prompt you to upload missing required documents before a claim can be filed with a carrier.`,
      },
    ],
  },
  {
    id: 'ai-features',
    title: 'AI Features',
    icon: Sparkles,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    description: 'Leverage AI to analyze claims, detect risk, and predict outcomes.',
    articles: [
      {
        title: 'Using the AI Copilot',
        icon: BotMessageSquare,
        content: `The AI Copilot is your intelligent assistant for all things freight claims.

**Accessing the Copilot**
Click the "Ask AI" button in the header or navigate to AI from the sidebar. The copilot opens as a chat interface where you can type questions in natural language.

**What You Can Ask**
• **Claim Questions** — "What's the status of claim #FC-2024-0042?" or "Show me all pending claims for XPO Logistics"
• **Analysis Requests** — "Analyze the risk factors for claim #FC-2024-0089" or "What's the likely outcome for this claim?"
• **Process Help** — "What documents do I need for a concealed damage claim?" or "What's the Carmack Amendment deadline for this claim?"
• **Draft Communications** — "Draft a follow-up email to the carrier for claim #FC-2024-0055" or "Write a demand letter for this denied claim"
• **Data Insights** — "What's our settlement rate with FedEx Freight this quarter?" or "Which carriers have the longest resolution times?"

**Copilot Capabilities**
The AI understands:
• Carmack Amendment rules and timelines
• Your organization's claim data and history
• Carrier-specific patterns and behaviors
• Document requirements by claim type
• Industry best practices for claim resolution

**Tips for Best Results**
• Be specific — include claim numbers or carrier names when asking about specifics
• Ask one question at a time for the clearest responses
• The copilot remembers context within a conversation, so you can ask follow-ups`,
      },
      {
        title: 'AI Claim Analysis',
        icon: BrainCircuit,
        content: `AI Claim Analysis provides deep insight into each claim's strengths, risks, and recommended actions.

**How It Works**
When you run AI analysis on a claim (from the claim detail page or AI > Risk Analysis), the system evaluates:

**Risk Assessment**
• Document completeness and quality
• Filing timeline compliance (is it within the Carmack Amendment window?)
• Consistency between documents (do BOL and POD details match?)
• Historical patterns with the specific carrier

**Fraud Detection**
• Duplicate claim detection across your portfolio
• Anomalous claim amounts compared to shipment value
• Unusual filing patterns (timing, frequency, locations)
• Cross-reference with known fraud indicators

**Compliance Check**
• Are all required documents present for the claim type?
• Is the claim within filing deadlines?
• Does the claim package meet carrier-specific requirements?
• Are there any regulatory issues?

**Recommendations**
Based on the analysis, the AI provides actionable recommendations:
• Additional documents to strengthen the claim
• Optimal filing strategy for the specific carrier
• Suggested claim amount adjustments
• Risk mitigation steps

**Analysis Scores**
Each claim receives scores for:
• **Strength** (A–F) — How strong is the claim based on documentation and facts?
• **Risk** (Low/Medium/High) — What is the risk of denial?
• **Compliance** (Pass/Warning/Fail) — Does the claim meet all regulatory requirements?`,
      },
      {
        title: 'Outcome Prediction',
        icon: TrendingUp,
        content: `AI Outcome Prediction uses machine learning to forecast how a claim is likely to be resolved.

**How Predictions Work**
The prediction model analyzes your claim against historical data, considering:
• **Carrier History** — How does this carrier typically handle similar claims? What's their approval rate, average settlement time, and payout ratio?
• **Claim Characteristics** — Claim type, amount, documentation quality, and filing timeliness all factor into the prediction
• **Industry Benchmarks** — How do similar claims across the industry typically resolve?

**Prediction Output**
For each claim, you'll see:
• **Predicted Outcome** — Likely result: Approved, Denied, or Partial Settlement
• **Confidence Level** — How confident the model is in its prediction (percentage)
• **Estimated Settlement** — Predicted settlement amount and range
• **Estimated Timeline** — How long the claim is likely to take to resolve
• **Key Factors** — The top factors influencing the prediction (positive and negative)

**Using Predictions**
• **Prioritize Claims** — Focus efforts on claims with high settlement potential
• **Set Expectations** — Give stakeholders realistic timelines and amounts
• **Improve Submissions** — Address negative factors before filing to improve outcomes
• **Negotiate Better** — Use predicted outcomes as a benchmark during carrier negotiations

**Accuracy**
The model's accuracy improves over time as it learns from your organization's specific claim outcomes. Prediction accuracy is displayed on the AI > Predict page along with model performance metrics.`,
      },
    ],
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    icon: BarChart3,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10',
    description: 'Generate reports, view analytics, and export your data.',
    articles: [
      {
        title: 'Generating Reports',
        icon: PieChart,
        content: `FreightClaims offers both pre-built and custom reports to help you analyze your claims data.

**Pre-Built Reports**
Navigate to Reports to access standard reports:
• **Claims Summary** — Overview of all claims by status, type, and carrier
• **Settlement Analysis** — Settlement rates, amounts, and trends over time
• **Carrier Scorecard** — Carrier performance metrics: claim volume, approval rates, resolution times
• **Aging Report** — Claims grouped by age, highlighting those approaching deadlines
• **Write-Off Report** — Claims closed without settlement and reasons

**Creating a Custom Report**
Go to Reports > New Report to build your own:
1. **Choose Data Source** — Claims, settlements, carriers, or documents
2. **Select Fields** — Pick which columns to include (claim number, carrier, amount, status, dates, etc.)
3. **Apply Filters** — Narrow by date range, carrier, claim type, status, or custom fields
4. **Choose Visualization** — Table, bar chart, line chart, or pie chart
5. **Save & Schedule** — Save the report to re-run later, or schedule it to run automatically (daily, weekly, monthly)

**Sharing Reports**
Reports can be shared with team members or emailed to stakeholders. Set up recurring email delivery for scheduled reports.

**Report Settings**
Configure default report preferences under Reports > Settings, including default date ranges, preferred export format, and email recipients.`,
      },
      {
        title: 'Understanding Insights',
        icon: TrendingUp,
        content: `The analytics dashboard provides real-time insights into your claims portfolio performance.

**Key Performance Indicators (KPIs)**
The dashboard header shows four primary KPIs:
• **Total Claims** — Count of all claims in the system with period-over-period change
• **Pending Review** — Claims awaiting analyst review
• **Settlement Rate** — Percentage of claims that result in a payout
• **Average Settlement** — Mean settlement amount across resolved claims

**Monthly Trend Chart**
The area chart shows claims filed vs. settled over the past 6 months. Use this to identify seasonal patterns and track whether your team is keeping up with incoming volume.

**Claims by Status**
The pie chart breaks down your current claims by status. A healthy portfolio should show most claims in "Settled" or "Closed" with a manageable number in active statuses.

**Claims by Type**
The horizontal bar chart shows the distribution of claim types. This helps identify the most common types of freight issues (damage, shortage, loss, etc.) so you can address root causes.

**Top Carriers**
The carrier table shows which carriers generate the most claims and their average settlement amounts. Use this to identify problematic carriers and negotiate better terms.

**Compliance Alerts**
The bottom banner highlights claims at risk of missing Carmack Amendment deadlines, so your team can take immediate action.`,
      },
      {
        title: 'Exporting Data',
        icon: Download,
        content: `Export your claims data for external analysis, reporting, or record-keeping.

**Export from Claims List**
From Claims > Claims List, click the "Export" button to download the current view:
• **Excel (.xlsx)** — Full-featured spreadsheet with formatting and multiple sheets
• **CSV (.csv)** — Simple comma-separated format compatible with any tool
• Exports respect your current filters, so filter the list first to export a specific subset

**Export from Reports**
Any report can be exported:
• Click the export icon on any report to download it
• Scheduled reports can be configured to auto-export and email the file

**What's Included**
Exported data includes:
• Claim number, status, type, and dates
• Carrier, shipper, and consignee details
• Claimed amount, approved amount, and settlement amount
• Filing dates and resolution timeline
• Custom fields configured for your organization

**Bulk Document Export**
To export documents for a set of claims:
1. Go to Claims > Claims List
2. Select the claims you want (checkbox column)
3. Click Actions > Export Documents
4. Choose to download as a ZIP file organized by claim number

**Data Retention**
All exported files are available in your browser's download history. The system does not store export files — generate a new export to get the latest data.`,
      },
    ],
  },
  {
    id: 'account-settings',
    title: 'Account & Settings',
    icon: UserCog,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
    description: 'Manage your profile, team members, and platform settings.',
    articles: [
      {
        title: 'Managing Your Profile',
        icon: User,
        content: `Keep your profile up to date for accurate activity tracking and communication.

**Accessing Your Profile**
Click your avatar in the top-right corner and select "Profile", or navigate to Settings > Profile.

**Editable Information**
• **Name** — Your display name shown across the platform
• **Email** — Your login email and where notifications are sent
• **Password** — Change your password (must be at least 8 characters with a mix of letters, numbers, and symbols)
• **Avatar** — Upload a profile photo
• **Job Title** — Your role for display purposes

**Notification Preferences**
Control which notifications you receive and how:
• **Claim Status Changes** — Get notified when claims you're assigned to change status
• **New Documents** — Alert when documents are uploaded to your claims
• **Comments & Notes** — Notifications for new comments on your claims
• **Compliance Deadlines** — Reminders about upcoming Carmack Amendment deadlines
• **Report Delivery** — Receive scheduled reports via email

Each notification type can be toggled on/off and configured for email delivery, in-app notification, or both.

**Theme**
Choose between Light mode, Dark mode, or System (matches your OS preference) under Settings > Profile.`,
      },
      {
        title: 'User Management',
        icon: Users,
        content: `Administrators can manage team access from Settings > Users.

**Inviting New Users**
1. Go to Settings > Users
2. Click "Invite User"
3. Enter the user's email address
4. Select a role (Admin, Manager, Analyst, Viewer)
5. Click "Send Invitation"

The user will receive an email with a link to set up their account and password.

**Managing Existing Users**
From the users list, you can:
• **Edit** — Change a user's role, name, or email
• **Deactivate** — Temporarily disable a user's access (their data and history are preserved)
• **Reactivate** — Re-enable a previously deactivated user
• **Delete** — Permanently remove a user (use with caution; reassign their claims first)

**User Activity**
Click on any user to see their activity log:
• Claims created, edited, or resolved
• Documents uploaded
• Last login date and time
• Total claims processed

**Best Practices**
• Use the principle of least privilege — assign the minimum role needed
• Deactivate rather than delete departing team members to preserve audit trails
• Review user access quarterly to ensure it's current
• Require strong passwords and encourage regular password changes`,
      },
      {
        title: 'Roles & Permissions',
        icon: ShieldCheck,
        content: `The role-based access control (RBAC) system lets you fine-tune what each user can see and do.

**Built-in Roles**

**Admin**
Full access to all features, settings, and data. Can manage users, roles, and organization settings. Recommended for: IT administrators, department heads.

**Manager**
Can create, edit, and manage claims. Access to reports and analytics. Can assign claims to team members. Cannot manage users or system settings. Recommended for: Team leads, senior analysts.

**Analyst**
Can create and edit claims assigned to them. Can upload documents and add notes. Limited report access. Cannot delete claims or manage other users. Recommended for: Claims processors, adjusters.

**Viewer**
Read-only access to claims and reports. Cannot create, edit, or delete any data. Recommended for: Executives, auditors, external stakeholders.

**Custom Roles**
Go to Settings > Roles to create custom roles with granular permissions:
• **Module Access** — Control which sections are visible (Claims, Reports, AI, Settings, etc.)
• **Action Permissions** — Control what actions are allowed within each module (View, Create, Edit, Delete, Export)
• **Data Scope** — Restrict access to specific data (e.g., only claims assigned to the user, only claims for specific carriers)

**Permission Inheritance**
Permissions are additive — a user gets the combined permissions of their assigned role. If a user needs one additional permission beyond their role, create a custom role rather than upgrading them to a higher role.`,
      },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openArticles, setOpenArticles] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setOpenCategory((prev) => (prev === id ? null : id));
    setOpenArticles(new Set());
  };

  const toggleArticle = (key: string) => {
    setOpenArticles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    if (!search) return helpCategories;
    const s = search.toLowerCase();
    return helpCategories
      .map((cat) => {
        const matchedArticles = cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(s) ||
            a.content.toLowerCase().includes(s)
        );
        const categoryMatch =
          cat.title.toLowerCase().includes(s) ||
          cat.description.toLowerCase().includes(s);
        if (categoryMatch) return cat;
        if (matchedArticles.length > 0) return { ...cat, articles: matchedArticles };
        return null;
      })
      .filter(Boolean) as HelpCategory[];
  }, [search]);

  const totalArticles = helpCategories.reduce((sum, c) => sum + c.articles.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary-500" /> Help Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {helpCategories.length} categories · {totalArticles} articles · Everything you need to know about FreightClaims
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) {
              setOpenCategory(null);
              setOpenArticles(new Set());
            }
          }}
          placeholder="Search for help articles, topics, or keywords..."
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 transition-shadow"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search results hint */}
      {search && (
        <p className="text-sm text-slate-500">
          {filteredCategories.length === 0
            ? 'No results found. Try a different search term.'
            : `Showing ${filteredCategories.reduce((s, c) => s + c.articles.length, 0)} article${filteredCategories.reduce((s, c) => s + c.articles.length, 0) !== 1 ? 's' : ''} across ${filteredCategories.length} categor${filteredCategories.length !== 1 ? 'ies' : 'y'}`}
        </p>
      )}

      {/* Category cards / accordion */}
      {!search && !openCategory ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className="card p-5 text-left hover:shadow-card-hover transition-all group"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', cat.color)}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                <p className="text-xs text-primary-500 mt-3 font-medium flex items-center gap-1">
                  {cat.articles.length} articles <ChevronRight className="w-3.5 h-3.5" />
                </p>
              </button>
            ))}
          </div>

          {/* Contact support banner */}
          <div className="card p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-500/5 dark:to-blue-500/5 border-primary-200/50 dark:border-primary-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Need more help?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Can&apos;t find what you&apos;re looking for? Contact our support team or use the AI Copilot for instant answers.
                </p>
                <div className="flex gap-4 mt-4">
                  <a
                    href="mailto:support@freightclaims.com"
                    className="text-sm font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    Email Support <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="/ai"
                    className="text-sm font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    Ask AI Copilot <BookOpen className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Category detail or search results */
        <div className="space-y-4">
          {/* Back button (only when viewing a single category, not search) */}
          {openCategory && !search && (
            <button
              onClick={() => {
                setOpenCategory(null);
                setOpenArticles(new Set());
              }}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to all categories
            </button>
          )}

          {filteredCategories
            .filter((cat) => (openCategory && !search ? cat.id === openCategory : true))
            .map((cat) => (
              <div key={cat.id}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cat.color)}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{cat.title}</h2>
                    <p className="text-sm text-slate-500">{cat.description}</p>
                  </div>
                </div>

                {/* Articles accordion */}
                <div className="space-y-2 mb-6">
                  {cat.articles.map((article, i) => {
                    const key = `${cat.id}-${i}`;
                    const isOpen = openArticles.has(key) || (search && cat.articles.length === 1);
                    return (
                      <div key={key} className="card overflow-hidden">
                        <button
                          onClick={() => toggleArticle(key)}
                          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <article.icon className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-900 dark:text-white text-sm flex-1 pr-2">
                            {article.title}
                          </span>
                          <ChevronDown
                            className={cn(
                              'w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                              {article.content.split('\n\n').map((paragraph, pi) => {
                                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                  const heading = paragraph.replace(/\*\*/g, '');
                                  return (
                                    <h4
                                      key={pi}
                                      className="text-sm font-semibold text-slate-900 dark:text-white mt-4 mb-2 first:mt-0"
                                    >
                                      {heading}
                                    </h4>
                                  );
                                }

                                const lines = paragraph.split('\n');
                                const isList = lines.every(
                                  (l) => l.startsWith('• ') || l.startsWith('- ') || l.startsWith('* ')
                                );

                                if (isList) {
                                  return (
                                    <ul key={pi} className="space-y-1.5 my-2">
                                      {lines.map((line, li) => (
                                        <li
                                          key={li}
                                          className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0 mt-1.5" />
                                          <span
                                            dangerouslySetInnerHTML={{
                                              __html: sanitizeHtml(line
                                                .replace(/^[•\-*]\s*/, '')
                                                .replace(
                                                  /\*\*(.+?)\*\*/g,
                                                  '<strong class="text-slate-700 dark:text-slate-300">$1</strong>'
                                                )),
                                            }}
                                          />
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                }

                                return (
                                  <p
                                    key={pi}
                                    className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed my-2"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtml(paragraph
                                        .replace(/\n/g, '<br/>')
                                        .replace(
                                          /\*\*(.+?)\*\*/g,
                                          '<strong class="text-slate-700 dark:text-slate-300">$1</strong>'
                                        )),
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Contact banner at the bottom of detail/search views */}
          <div className="card p-5 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-500/5 dark:to-blue-500/5 border-primary-200/50 dark:border-primary-500/20">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Still have questions?{' '}
                <a href="mailto:support@freightclaims.com" className="text-primary-500 hover:text-primary-600 font-medium">
                  Contact support
                </a>{' '}
                or{' '}
                <a href="/ai" className="text-primary-500 hover:text-primary-600 font-medium">
                  ask the AI Copilot
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
