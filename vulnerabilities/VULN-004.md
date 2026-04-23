# VULN-004: Alternative HTTP Port

> *The backdoor web server.*

## Summary

Standard web ports (80, 443) are closed; only alternative HTTP port 8080 is open.

| Attribute | Value |
|-----------|-------|
| ID | VULN-004 |
| Severity | MEDIUM |
| CVSS | 5.3 |
| Vector | Network |
| Target | [[targets/localhost]] |

---

## Technical Details

- **Service**: HTTP (Alternative)
- **Port**: 8080
- **Protocol**: TCP
- **Non-Standard**: Yes

---

## Exploitation Path

```
Attacker --> Port 8080 --> Web Enumeration --> Application Vulnerabilities
```

### Attack Scenarios

1. **Web Application Scan** - Nikto/dirb enumeration
2. **Proxy Discovery** - Identify as open proxy
3. **Admin Interface** - Alternative admin portal
4. **API Endpoints** - Undocumented REST APIs

---

## Impact

- Web application vulnerabilities
- Potential administrative interfaces
- Information disclosure
- Proxy abuse potential

---

## Recommendations

1. Audit web applications on alternate port
2. Check for management interfaces
3. Review proxy configurations
4. Close unused HTTP services

---

## References

- Memory: mem_1776850305918_g0yemv
- Tag: #web-server #ports