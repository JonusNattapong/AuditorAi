# 🛠️ Tools ที่ Agent จริงๆ ต้องการในโลกความเป็นจริง

## 🎯 หลักการสำคัญ
>
> **Agent ไม่จำเป็นต้องมี tools มาก แต่ต้องมี tools ที่สามารถแยกย่อยงานได้**
> ไม่ควรสร้าง tool เฉพาะงาน แต่ควรสร้าง tool ทั่วไปที่ Agent สามารถประยุกต์ใช้ทำงานใดๆ ได้

---

## ✅ ✨ Tier 0: Tools ที่ต้องมีแน่นอน (ไม่มีไม่ได้)

| Tool | ความสำคัญ | เหตุผล |
|---|---|---|
| `memory_read` / `memory_write` | 💯 10/10 | Agent ทุกตัวจะลืม สิ่งที่เขียนใน chat จะหายไป ต้องมีหน่วยความจำถาวรส่วนตัวที่สามารถอ่านเขียนได้ตลอดเวลา |
| `schedule_task` | 💯 10/10 | Agent ต้องสามารถตั้งเวลาทำงานในอนาคต เช่น รอ 5 นาที แล้วมาเช็คผลอีกครั้ง ทำงานซ้ำทุกๆ ชั่วโมง |
| `spawn_background_process` | 💯 10/10 | รันโปรแกรมที่ใช้เวลานาน ในขณะที่ Agent ทำงานอย่างอื่นต่อไป สามารถกลับมาดูผลทีหลังได้ |
| `ask_human` | 9/10 | เมื่อ Agent ติดขัด ไม่แน่ใจ ต้องสามารถถามคนได้ ไม่ควรตัดสินใจเองทุกอย่าง |
| `stop_self` | 9/10 | Agent ต้องสามารถหยุดตัวเองได้เมื่อทำงานเสร็จ หรือรู้ว่าทำไม่สำเร็จ |

---

## ✅ 🟢 Tier 1: Tools ที่เพิ่มประสิทธิภาพ 10 เท่า

| Tool | ความสำคัญ | เหตุผล |
|---|---|---|
| `search_file` / `grep` | 9/10 | ค้นหาข้อความในไฟล์หลายพันไฟล์ใน 1 วินาที เป็นสิ่งที่ Agent ใช้บ่อยที่สุดเลย |
| `git_commit` / `git_restore` | 9/10 | Agent ต้องสามารถย้อนกลับได้ เมื่อแก้ไขโค้ดแล้วพัง |
| `http_request` | 8/10 | เรียก API ใดๆ ได้โดยตรง ไม่ต้องผ่าน browser |
| `extract_text` | 8/10 | อ่านข้อความจาก PDF, Word, Excel, Image OCR โดยอัตโนมัติ |
| `run_code` | 8/10 | รันโค้ด Python / JS / Powershell ใน sandbox ทันที ไม่ต้องบันทึกเป็นไฟล์ |

---

## ✅ 🟡 Tier 2: Tools ที่มีไว้ดี แต่ไม่ได้ต้องมีตอนแรก

| Tool | ความสำคัญ |
|---|---|
| `send_notification` | 7/10 |
| `upload_file` | 7/10 |
| `open_browser` | 7/10 |
| `take_screenshot` | 6/10 |
| `get_system_info` | 6/10 |
| `kill_process` | 6/10 |
| `netstat` / `port_scan` | 6/10 |

---

## ❌ ❌ Tools ที่ไม่ควรสร้างเลย

❌ ไม่ต้องสร้าง tool `install_npm_package` → ใช้ `run_command npm install` ได้เลย
❌ ไม่ต้องสร้าง tool `create_react_app` → ใช้ `run_command npx create-react-app` ได้เลย
❌ ไม่ต้องสร้าง tool `scan_vulnerability` → ใช้ `run_command nuclei` ได้เลย

> 👉 **กฎทอง:** ถ้าทำได้ด้วย `run_command` อย่าสร้าง tool ใหม่เลย

---

## 🎯 สรุปอันดับการเพิ่ม

1. ✅ เพิ่ม `memory_read` / `memory_write` ก่อนอันดับแรก
2. ✅ เพิ่ม `spawn_background_process`
3. ✅ เพิ่ม `schedule_task`
4. ✅ เพิ่ม `ask_human`
5. ✅ เพิ่ม `search_file` / grep

ทุกอย่างอื่น Agent สามารถทำได้แล้วด้วย tools ที่เรามีอยู่แล้ว
