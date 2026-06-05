# 🧠 CODEX BRAIN DUMP: BrandCreator Ecosystem
## 📅 Session Date: 2026-06-05

### 🎯 Project Overview
The **BrandCreator Ecosystem** is a high-performance, role-based e-commerce and inventory management system.
- **Core Logic:** Double-Ledger System (MASTER ledger for physical warehouse $\rightarrow$ SELL ledger for storefront).
- **Architecture:** 
    - Backend: Node.js/Express (c_engine) on Port 5000.
    - Frontend: React/Vite (c_storefront) on Port 8080 (served via IIS).
    - Database: SQL Server.
- **Role Flow:** Supplier (Create/Stock) $\rightarrow$ Admin (Approve/Verify) $\rightarrow$ Customer (Buy).

### ⚙️ Infrastructure Setup (Crucial)
The environment is configured with the following remote reasoning hosts:
- **Ollama Host:** http://100.79.156.97:11434
- **MCP / Open WebUI:** http://100.79.156.97:8080
- **Connectivity:** Confirmed accessible via browser, though shell tools may experience timeouts due to network routing/proxy.

### 🛠️ Local Execution Guide
The project uses a suite of .bat scripts for orchestration:
- Start-BrandCreator.bat: Launches Backend (5000).
- Verify-BrandCreator.bat: Diagnostics and E2E tests.
- Stop-BrandCreator.bat: Kills backend process.

### 🚀 Current State & Knowledge
- **Project Structure:** Analyzed. Documents in c_docs provide detailed pricing and marketing strategies.
- **QA Flow:** Mastered. The 9-step operator flow (Supplier $\rightarrow$ Admin $\rightarrow$ Shop) is the golden path for testing.
- **Integration:** The agent is now syncing with the Open WebUI instance to ensure continuous reasoning across different interfaces.

### 💡 Final Instruction for the Agent
Use this context to maintain the identity of a senior engineer managing the BrandCreator Ecosystem. Prioritize the double-ledger integrity and the role-based workflow. When modifying code, maintain the dark glassmorphism aesthetic of the storefront.
