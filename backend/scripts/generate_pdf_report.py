import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(50, 11 * 72 - 32, "OpenBin 2.0 — Milestone & Technical Architecture Report")
            self.drawRightString(8.5 * 72 - 50, 11 * 72 - 32, "Confidential & Authoritative")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(50, 11 * 72 - 38, 8.5 * 72 - 50, 11 * 72 - 38)

        # Footer (All pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(50, 42, 8.5 * 72 - 50, 42)
        self.drawString(50, 28, "© 2026 OpenBin Technologies. All rights reserved.")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 50, 28, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Palette
    c_navy = colors.HexColor("#071F5C")
    c_blue = colors.HexColor("#0E3695")
    c_emerald = colors.HexColor("#0B4E3D")
    c_lightgreen = colors.HexColor("#E1F5EE")
    c_lightblue = colors.HexColor("#E6F0FD")
    c_slate = colors.HexColor("#334155")
    c_muted = colors.HexColor("#64748B")
    c_border = colors.HexColor("#CBD5E1")
    c_bg_panel = colors.HexColor("#F8FAFC")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_navy,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_blue,
        spaceAfter=10
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_muted
    )
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13.5,
        leading=17,
        textColor=c_navy,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_blue,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=c_slate,
        spaceAfter=4
    )
    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.8,
        textColor=c_slate,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.8,
        textColor=c_slate
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.8,
        textColor=c_navy
    )
    table_header = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=10.8,
        textColor=colors.white
    )

    story = []

    # ================= PAGE 1 =================
    story.append(Paragraph("OPENBIN 2.0 SMART RECYCLING PLATFORM", meta_style))
    story.append(Paragraph("Project Milestone & Full Development Report", title_style))
    story.append(Paragraph("Authoritative Summary of Architecture, Portals, RVM Integration & Completed Features", subtitle_style))
    
    meta_table_data = [
        [
            Paragraph("<b>Repository:</b> github.com/hameedshaik2345/OpenBin_WebApplication", meta_style),
            Paragraph("<b>Stack:</b> React 19 + Node/Express + PostgreSQL + Firebase", meta_style)
        ],
        [
            Paragraph("<b>Primary Branch:</b> main (Synchronized)", meta_style),
            Paragraph("<b>Status:</b> All Features Functional & Mobile-Optimized", meta_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[280, 232])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_panel),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary & Solution Mission", h1_style))
    story.append(Paragraph(
        "OpenBin is an enterprise-grade circular economy platform bridging physical Reverse Vending Machines (RVMs), "
        "campus consumers, FMCG brands (EPR compliance), and authorized waste recyclers. The platform incentivizes sustainable "
        "behavior by dispensing real-time financial rewards (OpenCoins) when users recycle plastic (PET) and aluminium beverage containers, "
        "while providing brands and regulatory bodies (CPCB) with verifiable, audit-ready EPR recovery records.",
        body_style
    ))

    # 2. Work Done by Domain - Consumer & EPR
    story.append(Paragraph("2. Detailed Work Completed to Date", h1_style))

    story.append(Paragraph("A. Consumer & Public User Portal (/dashboard)", h2_style))
    story.append(Paragraph("• <b>Unified Mobile Navigation:</b> Engineered an intuitive 5-tab mobile navigation bar with Home, Wallet, floating centered Scan button, History, and Impact. Removed legacy duplicate navbars and relocated Profile to an icon-only button in the top header.", bullet_style))
    story.append(Paragraph("• <b>Dual-Mode QR Claim Engine:</b> Embedded a live browser camera scanner using <code>Html5Qrcode</code> with auto-environmental lens detection, paired with a resilient JSON payload manual paste fallback for testing.", bullet_style))
    story.append(Paragraph("• <b>Anti-Replay Security & Cryptographic Settlement:</b> Claim tokens are hashed via SHA-256 upon RVM issuance. Double-claiming, expired tokens, or malformed payloads trigger graceful contextual error handling.", bullet_style))
    story.append(Paragraph("• <b>Double-Entry Wallet & Ledger:</b> Users can view live INR balances, initiate real-time UPI withdrawals, or donate to the Clean Campus Community Fund. Historical credit/debit movements are dynamically rendered from PostgreSQL.", bullet_style))
    story.append(Paragraph("• <b>Schema Normalization:</b> Resolved critical database column mismatches (<code>claim_status</code>, <code>estimated_weight_g</code>, <code>reward_value</code>) ensuring real deposits accurately increment personal impact counters and history records.", bullet_style))
    story.append(Paragraph("• <b>Dynamic Impact Metrics & Charts:</b> Replaced static demo figures with true PostgreSQL counts for items recycled, landfill weight diversion (kg), and dynamic monthly Chart.js visualization.", bullet_style))

    story.append(Paragraph("B. Brand Partner & Enterprise EPR Portal (/epr)", h2_style))
    story.append(Paragraph("• <b>Role-Based Access Control:</b> Route guards securely isolate Brand Partner functionality to <code>EPR</code> and <code>ADMIN</code> roles.", bullet_style))
    story.append(Paragraph("• <b>Real-Time Socket.io Telemetry:</b> Subscribed to <code>liveState</code> WebSocket broadcasts, streaming physical machine fullness, bottle counts, and operational health in real time.", bullet_style))
    story.append(Paragraph("• <b>SKU & Material Analysis:</b> Track recovery volumes classified by manufacturer (e.g., PepsiCo, Coca-Cola), brand (Aquafina, Kinley), and material type (PET, Aluminium).", bullet_style))
    story.append(Paragraph("• <b>Compliance Certification & Exports:</b> Generates certified quarterly CPCB-compliant recovery certificates with automated CSV and PDF download capabilities.", bullet_style))
    story.append(Paragraph("• <b>Full Mobile Responsiveness:</b> Comprehensive touch navigation and responsive tables so brand managers can monitor recycling quotas from mobile devices.", bullet_style))

    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("C. Administrative Operations Suite (/admin)", h2_style))
    story.append(Paragraph("• <b>AppShell Responsive Drawer:</b> Added a slide-out hamburger navigation drawer on mobile and persistent sidebar on desktop, featuring an unread notification center.", bullet_style))
    story.append(Paragraph("• <b>User & Partner Management (/admin/users):</b> Complete administrative search, user role modification, account status freezing/unfreezing, and dedicated Brand Partner onboarding form.", bullet_style))
    story.append(Paragraph("• <b>Smart RVM Fleet (/admin/rvms):</b> Provision physical or simulated machines, assign GPS coordinates/campus buildings, and monitor storage fullness.", bullet_style))
    story.append(Paragraph("• <b>Scrap Material Pricing (/admin/pricing):</b> Dynamic reimbursement rate controller for recyclables per kilogram with immutable historical rate freezing.", bullet_style))
    story.append(Paragraph("• <b>Collection Logistics (/admin/collection):</b> Log collection batches picked up from campus RVMs, register accredited recycler facilities, and generate reconciliation audit logs.", bullet_style))
    story.append(Paragraph("• <b>Immutable Audit Trail (/admin/audit):</b> System-wide immutable logging of all financial, pricing, and administrative events.", bullet_style))

    story.append(Paragraph("D. Hardware Integration & RVM Simulator (/rvm-simulator)", h2_style))
    story.append(Paragraph("• <b>Complete IoT State Machine:</b> Replicates physical RVM sensor cycles (IDLE → CONTAINER_INSERTED → CLASSIFYING → SESSION_READY → DISPENSING).", bullet_style))
    story.append(Paragraph("• <b>Dynamic QR Token Generation:</b> Live generation of high-contrast QR codes embedding UUID transaction tokens with configurable 15-minute expiration timers.", bullet_style))
    story.append(Paragraph("• <b>Automated Expiry Worker:</b> Background cron worker running in Node.js that checks for expired unclaimed rewards every 60 seconds and transfers them to community charity.", bullet_style))
    story.append(Paragraph("• <b>Restyled Emerald & Navy Theme:</b> Modernized bezel with high contrast, glowing status indicators, and clean Manrope typography matching OpenBin branding.", bullet_style))
    story.append(Spacer(1, 8))

    # 3. Systems Architecture Matrix
    story.append(Paragraph("3. Technical Architecture & Endpoints Matrix", h1_style))
    
    table_data = [
        [
            Paragraph("Module / Domain", table_header),
            Paragraph("Routes & Components", table_header),
            Paragraph("Key Responsibilities & Data Handlers", table_header)
        ],
        [
            Paragraph("<b>Auth & Identity</b>", table_cell_bold),
            Paragraph("<code>/login</code>, <code>/register</code><br/><code>/api/auth/*</code>", table_cell),
            Paragraph("Firebase token verification, PostgreSQL user record synchronization, role dispatching (USER, EPR, ADMIN).", table_cell)
        ],
        [
            Paragraph("<b>User Portal</b>", table_cell_bold),
            Paragraph("<code>/dashboard</code>, <code>/dashboard/scan</code><br/><code>/dashboard/history</code>", table_cell),
            Paragraph("Real-time wallet, QR scanner modal, withdrawal & donation execution, transaction filtering, dynamic charts.", table_cell)
        ],
        [
            Paragraph("<b>Brand ERP (EPR)</b>", table_cell_bold),
            Paragraph("<code>/epr</code>, <code>/epr/rvms</code><br/><code>/epr/reports</code>", table_cell),
            Paragraph("Live machine state streaming via Socket.io, brand SKU tracking, quarterly CPCB report exports.", table_cell)
        ],
        [
            Paragraph("<b>Admin Operations</b>", table_cell_bold),
            Paragraph("<code>/admin/*</code> (9 Modules)", table_cell),
            Paragraph("User management, fleet provisioning, dynamic pricing, batch reconciliation, and system audit logs.", table_cell)
        ],
        [
            Paragraph("<b>Hardware / IoT</b>", table_cell_bold),
            Paragraph("<code>/rvm-simulator</code><br/><code>/api/rvm/transactions</code>", table_cell),
            Paragraph("Sensor telemetry ingestion, dynamic QR code generation, 15-minute TTL enforcement, background expiry worker.", table_cell)
        ]
    ]

    arch_table = Table(table_data, colWidths=[100, 152, 260])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_navy),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_panel]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(arch_table)

    story.append(PageBreak())

    # ================= PAGE 3 =================
    # 4. Verified Credentials
    story.append(Paragraph("4. Verified Active Credentials & Role Access", h1_style))
    story.append(Paragraph("All administrative and enterprise accounts have been verified directly against active Firebase Auth and PostgreSQL ledgers:", body_style))

    cred_data = [
        [
            Paragraph("Account Role", table_header),
            Paragraph("Email Address", table_header),
            Paragraph("Password", table_header),
            Paragraph("Designated Landing Portal", table_header)
        ],
        [
            Paragraph("<b>Primary Administrator</b>", table_cell_bold),
            Paragraph("openbinsolutions@gmail.com", table_cell),
            Paragraph("openbin123", table_cell),
            Paragraph("<code>/admin</code> (Full Authority)", table_cell)
        ],
        [
            Paragraph("<b>Brand Partner (EPR)</b>", table_cell_bold),
            Paragraph("partner@openbin.com", table_cell),
            Paragraph("openbin123", table_cell),
            Paragraph("<code>/epr</code> (Brand Dashboard)", table_cell)
        ],
        [
            Paragraph("<b>Brand Partner (Alt)</b>", table_cell_bold),
            Paragraph("partner@coolfizz.com", table_cell),
            Paragraph("openbin123", table_cell),
            Paragraph("<code>/epr</code> (Brand Dashboard)", table_cell)
        ],
        [
            Paragraph("<b>Consumer / Public</b>", table_cell_bold),
            Paragraph("Open self-registration", table_cell),
            Paragraph("User-defined", table_cell),
            Paragraph("<code>/dashboard</code> (User Portal)", table_cell)
        ]
    ]

    cred_table = Table(cred_data, colWidths=[110, 152, 90, 160])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_blue),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_panel]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(cred_table)
    story.append(Spacer(1, 10))

    # 5. Deployment Process
    story.append(Paragraph("5. Deployment Roadmap & Infrastructure Recommendations", h1_style))
    story.append(Paragraph(
        "<b>Why Not Vercel for Backend:</b> OpenBin's backend requires persistent TCP WebSockets (<code>Socket.io</code>) "
        "for streaming RVM machine states and continuous background intervals (<code>expiryWorker.js</code>) to expire unclaimed rewards. "
        "Serverless platforms like Vercel freeze idle instances and terminate WebSocket connections.",
        body_style
    ))
    story.append(Paragraph("<b>Recommended Cloud Architecture:</b>", h2_style))
    story.append(Paragraph("• <b>Frontend:</b> Deploy to <b>Vercel</b> (automatic builds from <code>frontend</code> root, fast CDN, zero config).", bullet_style))
    story.append(Paragraph("• <b>Backend API & WebSockets:</b> Deploy to <b>Render.com</b> or <b>Railway.app</b> as a standard Web Service (native 24/7 Node process, full Socket.io support, background worker persistence).", bullet_style))
    story.append(Paragraph("• <b>Relational Database:</b> Deploy to <b>Neon.tech</b> or <b>Supabase</b> (managed PostgreSQL, automated SSL connection pooling).", bullet_style))
    story.append(Paragraph("• <b>Authentication:</b> Whitelist the production Vercel domain in Firebase Console under Authentication → Authorized Domains.", bullet_style))
    story.append(Spacer(1, 10))

    # 6. Verification & Sign-off
    story.append(Paragraph("6. Project Audit & Build Verification Status", h1_style))
    story.append(Paragraph("✓ <b>Frontend Build:</b> <code>npm run build</code> succeeded with 0 errors (Vite production bundle generated).", bullet_style))
    story.append(Paragraph("✓ <b>Mobile Responsiveness:</b> Validated on 375px, 414px, and 768px viewport widths with responsive tables, drawer nav, and geometric bottom bar alignment.", bullet_style))
    story.append(Paragraph("✓ <b>Git Synchronization:</b> All commits, merge conflict resolutions, and schema bug fixes pushed cleanly to GitHub repository <code>main</code> branch.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == "__main__":
    out_dir = r"c:\Users\HP\Downloads\Openbin\Openbin"
    out_path = os.path.join(out_dir, "OpenBin_Project_Milestone_Report.pdf")
    build_pdf(out_path)
