# VULN-003: RDP High Risk Exposure

> *The target that's too easy to hit.*

## Summary

RDP service on port 3389 is exposed and represents a high-risk brute-force attack vector.

| Attribute | Value |
|-----------|-------|
| ID | VULN-003 |
| Severity | CRITICAL |
| CVSS | 9.3 |
| Vector | Network |
| Target | [[targets/localhost]] |

---

## Technical Details

- **Service**: Remote Desktop Protocol
- **Port**: 3389
- **Protocol**: TCP
- **Exposure**: Network accessible

---

## Exploitation Path

```
Attacker --> Port 3389 --> Brute Force / Credential Stuffing --> Desktop Access
```

### Attack Scenarios

1. **Brute Force Attack** - Password spraying
2. **Credential Stuffing** - Reused credentials from breaches
3. **BlueKeep-type Exploits** - RDP vulnerabilities (if unpatched)
4. **Session Hijacking** - Active session takeover

---

## Impact

- Desktop environment compromise
- Access to user files and data
- Internal network visibility
- Keylogger/monitoring capability
- Enterprise credential harvesting

---

## Recommendations

1. Disable RDP if not business-required
2. Implement Network Level Authentication (NLA)
3. Use VPN for remote access
4. Deploy RDP gateway
5. Monitor for brute-force patterns
6. Restrict to specific IPs

---

## References

- Memory: mem_1776850305899_wpt1i5
- Tag: #rdp #high-risk #brute-force