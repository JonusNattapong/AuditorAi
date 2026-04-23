# VULN-002: Exposed Database Services

> *Two databases. Twice the treasure.*

## Summary

Multiple database services (PostgreSQL and MSSQL) are running concurrently on the same host, exposing sensitive data stores.

| Attribute | Value |
|-----------|-------|
| ID | VULN-002 |
| Severity | HIGH |
| CVSS | 8.5 |
| Vector | Network |
| Target | [[targets/localhost]] |

---

## Technical Details

| Database | Port | Type |
|----------|------|------|
| PostgreSQL | 5432 | Relational |
| MSSQL | 1433 | Relational |

- **Exposure**: Both databases accessible on network
- **Configuration**: Default ports in use
- **Co-location**: Multiple DBs on single host

---

## Exploitation Path

```
Attacker --> Port 5432/1433 --> SQL Injection OR Credential Access --> Data Exfiltration
```

### Attack Scenarios

1. **SQL Injection** - Application-level injection points
2. **Default Credentials** - Brute-force sa/account
3. **Network-based Access** - Direct connection attempts
4. **Data Exfiltration** - Dump sensitive tables

---

## Impact

- Exposure of customer data
- Intellectual property theft
- Database manipulation/deletion
- Potential pivoting to other systems
- Compliance violations (PII/PHI)

---

## Recommendations

1. Restrict database network exposure
2. Implement strong authentication
3. Use non-default ports
4. Enable audit logging
5. Apply network segmentation
6. Encrypt data at rest

---

## References

- Memory: mem_1776850305901_z58mws
- Tag: #database #environmental-fact