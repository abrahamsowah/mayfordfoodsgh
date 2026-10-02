# 🛡️ Sajama Shield: Enterprise Autonomous Observability & Client Intelligence SaaS

> **A proprietary in-house agency asset giving you an unfair edge over competitors in monitoring, securing, diagnosing, optimizing, and delivering executive-grade reports for all client websites.**

---

## 🌟 Why Sajama Shield is a Business Asset

1. **Unrivaled Client Transparency & Intelligence**:
   - Know about client site issues (downtime, slow page loads, SSL expiry, JS runtime crashes) **before your clients or their customers ever notice**.
   - Monitor real user performance across West Africa and worldwide (TTFB, FCP, LCP, CLS, INP) over cellular (3G/4G) and broadband.

2. **Real-Time Security & Active Defense Radar**:
   - Continuous TLS 1.3 / SSL expiration countdown.
   - 6-point HTTP Security Headers posture scanner (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
   - Automated secret leakage scanner (probes for exposed `.env`, `.git`, `wp-config.php`, `debug.log`).
   - DOM tamper and malicious script injection alarms.

3. **100% Privacy & Legal Compliance (Strict Zero-PII)**:
   - Full compliance with the **Ghana Data Protection Act 2012 (Act 843)**, **EU GDPR**, and **UK GDPR**.
   - Visitor IP addresses are immediately anonymized via SHA-256 with a **daily rotating salt** and never stored.
   - Zero form fields, passwords, or personal details tracked.
   - Operates entirely cookie-less via non-blocking `navigator.sendBeacon`.

4. **1-Click Executive Client Report Generator (C-Suite Ready)**:
   - Generate professional, agency-branded **Monthly Infrastructure & Security Audits** with letter grades (A+ to F), SLA compliance certificates, Core Web Vitals breakdown, and strategic ROI recommendations.
   - Export directly as PDF or print for stakeholder reviews.

5. **Multi-Tenant Portfolio Management**:
   - Monitor tens or hundreds of client websites from a single command dashboard.
   - Shareable public status pages (`/status/:clientId`) with 90-day uptime bars.

---

## 📦 How to Install on Any Client Website

Drop this single lightweight (~2.2 KB gzipped, zero-dependency) script tag before `</head>` or `</body>`:

```html
<!-- HTML / WordPress / Shopify / React / Next.js / Custom PHP -->
<script src="https://shield.youragency.com/sajama-tag.js" data-site-id="site_client_name_001" async></script>
```

### Optional JavaScript Tracking API for Client Developers:

```javascript
// Track custom conversions or funnel steps
window.sajamaShield.trackConversion('checkout_completed', 250.00, { branch: 'Adabraka' });

// Track custom interactions
window.sajamaShield.track('combo_deal_clicked', { itemId: 42 });
```

---

## 🚀 Standalone Extraction & Deployment Runbook

Sajama Shield is completely standalone and can be hosted independently on any Linux VM, VPS, Docker container, or cloud server:

```bash
# 1. Copy the standalone sajama-shield directory to your production server
cp -r sajama-shield /var/www/sajama-shield
cd /var/www/sajama-shield

# 2. Install lightweight dependencies
npm install

# 3. Configure environment variables (optional)
export PORT=5000
export SAJAMA_SHIELD_KEY="your-agency-master-key"
export SESSION_SECRET="your-secure-session-secret"

# 4. Start the autonomous SaaS platform
npm start
# -> Standalone Sajama Shield running at http://0.0.0.0:5000
```

---

## 🔐 Master Key Access
* Default Console Master Key: `sajama2026`
* Change via the `SAJAMA_SHIELD_KEY` environment variable.
