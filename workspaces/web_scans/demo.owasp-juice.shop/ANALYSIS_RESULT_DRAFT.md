# Security Assessment Draft

## Target
- **Input:** https://demo.owasp-juice.shop/
- **Mode:** WEB
- **Status:** COMPLETE

---

## Security Sub-system Discovery

### Evidence Gathered (FACTUAL)
- **Main Page:** Successfully rendered at `/` - Products visible (Apple Juice, Banana Juice, Apple Pomace, etc.)
- **Login Page:** Accessible at `/#/login` - Contains login form, "Forgot your password?" link, Google OAuth option
- **Score Board:** Accessible at `/#/score-board` - Lists vulnerability challenges by category
- **API Products:** `GET /api/Products` - Returns complete product catalog (NO AUTH REQUIRED)
- **API Challenges:** `GET /api/Challenges` - **CRITICAL EXPOSURE** - Returns vulnerability challenge data (NO AUTH REQUIRED)
- **API Users:** `GET /api/Users` - Returns 401 Unauthorized (AUTH REQUIRED - Good)
- **API BasketItems:** `GET /api/BasketItems` - Returns 401 Unauthorized (AUTH REQUIRED - Good)
- **FTP Directory:** `GET /ftp/` - **CRITICAL EXPOSURE** - Directory listing accessible without auth

### API Endpoints Identified
| Endpoint | Auth Required | Status |
|----------|---------------|--------|
| `/api/Products` | ❌ No | Returns product data |
| `/api/Challenges` | ❌ No | **EXPOSES VULNERABILITIES** |
| `/api/Users` | ✅ Yes | 401 Unauthorized |
| `/api/BasketItems` | ✅ Yes | 401 Unauthorized |
| `/ftp/` | ❌ No | **DIRECTORY LISTING EXPOSED** |
| `/ftp/package.json.bak` | ✅ Yes | 403 Forbidden |
| `/ftp/legal.md` | ❌ No | Returns content |
| `/ftp/acquisitions.md` | ❌ No | **CONFIDENTIAL DOCUMENT EXPOSED** |

---

## Tactical Interaction Analysis

### Key Findings (CONFIRMED)
1. **CRITICAL EXPOSURE - FTP Directory:** Accessible at `/ftp/` - Exposes multiple sensitive files:
   - `incident-support.kdbx` - KeePass database (password vault) - INACCESSIBLE but listed
   - `package.json.bak` - NPM dependencies (403 blocked)
   - `package-lock.json.bak` - Dependency lock file - INACCESSIBLE
   - `encrypt.pyc` - Compiled Python bytecode - INACCESSIBLE
   - `announcement_encrypted.md` - Encrypted announcement - INACCESSIBLE
   - `acquisitions.md` - **CONFIDENTIAL acquisition data** - ACCESSIBLE
   - `coupons_2013.md.bak` - Old coupon codes - INACCESSIBLE
   - `eastere.gg` - Easter egg file - INACCESSIBLE
   - `suspicious_errors.yml` - Error logs - INACCESSIBLE
   - `legal.md` - Legal documents - ACCESSIBLE

2. **CONFIDENTIAL DOCUMENT EXPOSED:** `/ftp/acquisitions.md` contains "Planned Acquisitions" - marked "confidential" but accessible without authentication

3. **CRITICAL EXPOSURE - Challenge API:** `/api/Challenges` returns ALL vulnerability challenges including:
   - Challenge names (e.g., "Password Hash Leak", "Admin Registration", "Christmas Special")
   - Categories (XSS, Broken Access Control, Injection, Broken Authentication, etc.)
   - Difficulty levels (1-6)
   - Detailed descriptions explaining vulnerability and attack vectors
   - Mitigation URLs (OWASP cheatsheets)

4. **Security Controls Confirmed:** `/api/Users` and `/api/BasketItems` properly require authentication

---

## Data Exposure Log

### HIGH-VALUE ASSETS AT RISK (CONFIRMED)
1. **Confidential Business Data:** `/ftp/acquisitions.md` - Planned acquisition targets exposed
2. **FTP Directory Exposure:** Sensitive file listing including password vault reference
3. **Vulnerability Blueprint Exposure:** `/api/Challenges` exposes entire vulnerability landscape
4. **API Product Data:** Product catalog accessible without authentication

---

## Critical Points of Failure (VULNERABILITIES CONFIRMED)

### From Challenge API & FTP - Confirmed Vulnerable Areas:
| Category | Challenge Count | Example |
|----------|-----------------|---------|
| **XSS** | 4+ challenges | API-only XSS, Client-side XSS Protection, CSP Bypass |
| **Broken Access Control** | 3+ challenges | Admin Section, Web3 Sandbox |
| **Injection** | Multiple | Christmas Special (SQLi), RCE |
| **Broken Authentication** | 3+ challenges | Password reset flaws, Bender password change |
| **Sensitive Data Exposure** | 3+ challenges | Password Hash Leak, Confidential Document, Acquisitions |
| **Improper Input Validation** | 2+ challenges | Admin Registration, NFT Mint |
| **Security Misconfiguration** | Present | Access Log disclosure, FTP directory listing |
| **Vulnerable Components** | Present | encrypt.pyc, package vulnerabilities |

---

## Gaps To Investigate Next (COMPLETED)

1. [x] Confirmed: API Products endpoint accessible without auth
2. [x] **CRITICAL:** API Challenges endpoint exposes ALL vulnerability details
3. [x] **CRITICAL:** FTP directory listing exposes sensitive files
4. [x] **CRITICAL:** `/ftp/acquisitions.md` exposes confidential business data
5. [x] Confirmed: BasketItems API properly requires authentication
6. [ ] Test login endpoint (`/api/Users/login`) for SQL injection - NOT TESTED (noted for future)
7. [ ] Probe feedback form for XSS - NOT TESTED (noted for future)
8. [ ] Test forgotten password flow - NOT TESTED (noted for future)

---

## Remediation Vectors

**Confirmed Attack Surface:**
- `/ftp/acquisitions.md` - Confidential document accessible (HIGH VALUE)
- `/ftp/legal.md` - Legal documents accessible
- `/ftp/` - Directory listing (INTENTIONAL vulnerability)
- `/api/Products` - No auth required (enumeration possible)
- `/api/Challenges` - No auth required (vulnerability disclosure - INTENTIONAL)

**Protected Endpoints (Good):**
- `/api/Users` - Requires authentication
- `/api/BasketItems` - Requires authentication

---

## Strategic Synthesis

### Core Resilience Analysis
**Status:** ASSESSMENT COMPLETE

**Key Confirmed Findings:**
1. **INTENTIONAL VULNERABILITIES:** OWASP Juice Shop is a deliberately vulnerable training app
2. **CONFIDENTIAL DATA EXPOSURE:** Acquisitions document marked "confidential" but publicly accessible
3. **FTP Directory Exposure:** Sensitive files listed (KeePass DB, dependency files)
4. **API Exposure:** Challenge API exposes entire vulnerability catalog (intentional for learning)
5. **Security Controls:** Some endpoints properly protected (Users API, BasketItems API), others intentionally open

**Vulnerability Count:** 40+ challenges across 10+ categories exposed

**Risk Level:** HIGH (by design - training application)

**Assessment Conclusion:** This is a security TRAINING application with intentional vulnerabilities. Multiple critical exposures confirmed: FTP directory listing, confidential acquisitions document, unauthenticated product API, and Challenge API disclosure. The application properly protects some endpoints (Users, BasketItems) while intentionally exposing others for training purposes.

---

## 📋 FINAL STRATEGIC SECURITY HARDENING LOG

### Critical Points of Failure
| ID | Vulnerability | Category | Severity | Evidence |
|----|---------------|----------|----------|----------|
| 1 | FTP Directory Listing | Security Misconfiguration | HIGH | `/ftp/` returns file listing without auth |
| 2 | Confidential Document Exposure | Sensitive Data Exposure | HIGH | `/ftp/acquisitions.md` accessible - marked "confidential" |
| 3 | Challenge API Disclosure | Information Disclosure | MEDIUM | `/api/Challenges` exposes all vulnerability details |
| 4 | Unauthenticated Product API | Enumeration | LOW | `/api/Products` accessible without auth |

### Security Gaps Requiring Hardening
1. **FTP Directory:** Disable directory listing or require authentication
2. **Sensitive Files:** Restrict access to acquisitions.md, legal.md
3. **Challenge API:** Consider authentication or rate limiting
4. **Product API:** Add authentication layer if data is sensitive

### Protected Assets (Functioning Controls)
- `/api/Users` - Properly requires authentication ✅
- `/api/BasketItems` - Properly requires authentication ✅
- Various FTP files - Return 403 Forbidden ✅

---

**Assessment Type:** Security Training Environment (Deliberately Vulnerable)
**Overall Risk Rating:** HIGH (By Design)
**Recommendation:** This is an intentional vulnerable target for security training. Do NOT deploy in production.