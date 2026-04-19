---
# Reverse Engineer — Analysis Export
# Repo: mufeedvh/code2prompt
# Branch: main
# Type: repository
# Path: /
# Date: 2026-04-05T11:13:46.279Z
---


Act as an expert developer. Based on the following system specification...

# 📋 BLUEPRINT: Code2Prompt System Implementation

## 1. Executive Summary (บทสรุปผู้บริหาร)

**วัตถุประสงค์หลัก:** Code2Prompt เป็นเครื่องมือ CLI ที่ออกแบบมาเพื่อแปลง codebase ทั้งหมดให้เป็น prompt เดียวสำหรับ Large Language Models (LLM) โดยมีความสามารถในการ:

- อ่านไฟล์อย่างชาญฉลาด (CSV, JSONL, Jupyter Notebooks)
- กรองไฟล์ด้วย glob patterns และ .gitignore
- สร้าง prompt ด้วย Handlebars templates
- นับจำนวน token เพื่อควบคุม context window
- รวม Git metadata (diffs, logs, branches)
- มีทั้ง CLI แบบ minimal และ TUI แบบ interactive

**เป้าหมายทางธุรกิจ:** ลดภาระงาน manual copy-paste code และ format code สำหรับ AI models, ทำให้ developers สามารถส่ง context ให้ LLM ได้อย่างมีประสิทธิภาพ

**เป้าหมายทางเทคนิค:** สร้าง Rust-based high-performance tool ที่รองรับ หลาย platforms (Linux, macOS, Windows) และมี Python bindings สำหรับ AI agents

---

## 2. Architectural Overview (ภาพรวมสถาปัตยกรรม)

ระบบ Code2Prompt แบ่งออกเป็น 4 components หลักที่ทำงานร่วมกัน:

```mermaid
graph TD
    subgraph "User Layer"
        CLI["CLI Interface