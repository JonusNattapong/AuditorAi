# VULN-001: SSH Remote Access Exposed

> *Port 22 — The front door is wide open.*

## Summary

SSH service (TCP port 22) is exposed on localhost, allowing remote command execution.

| Attribute | Value |
|-----------|-------|
| ID | VULN-001 |
| Severity | CRITICAL |
| CVSS | 9.1 |
| Vector | Network |
| Target | [[targets/localhost]] |

---

## Technical Details

- **Service**: SSH (OpenSSH)
- **Port**: 22
- **Protocol**: TCP
- **Exposure**: Publicly accessible

---

## Exploitation Path

```
Attacker --> Port 22 --> SSH Authentication --> Remote Command Execution --> SYSTEM
```

### Attack Scenarios

1. **Brute Force Attack** - Credential spraying against SSH
2. **Dictionary Attack** - Common password combinations
3. **Key Exhaustion** - SSH key guessing
4. **Exploit Chaining** - Use after initial foothold

---

## Impact

- Complete system compromise
- Remote command execution as authenticated user
- Potential lateral movement
- Data exfiltration capability

---

## Recommendations

1. Disable SSH if not required
2. Implement key-based authentication only
3. Rate limit authentication attempts
4. Deploy fail2ban or similar countermeasures
5. Use non-standard port (if required)

---

## References

- Memory: mem_1776850305920_3iue77
- Tag: #ssh #remote-access