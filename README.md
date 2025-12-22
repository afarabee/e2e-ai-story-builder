# 📋 AI-Assisted User Story Generator

[![Built with Lovable](https://img.shields.io/badge/Built_with-Lovable-db2777?style=flat-square&logo=heart)](https://lovable.dev/projects/00b71058-6b2b-4a5c-8dfa-0b146db9a748)

**AI-Assisted User Story Generator** is an AI-powered tool designed to streamline the creation, refinement, and management of Agile user stories. It helps Product Owners and Developers generate high-quality stories, refine them via an intelligent chat interface, and push finalized Product Backlog Items (PBIs) directly to **Azure DevOps (ADO)**.

---

## 🚀 Features

### 🧠 Intelligent Story Generation
* **Progressive Workflow:** Starts with a clean "Raw Input" interface to focus on the core Role/Action/Goal, then expands into a full suite of tools (Details, Chat, Dev Notes) upon generation.
* **Smart Refinement Chat:** An integrated chatbot that suggests improvements for Titles, Descriptions, and Acceptance Criteria.
    * **Apply & Undo:** Instantly apply AI suggestions to the active story or undo changes with a single click.
    * **Context Aware:** The AI is aware of the current story state and strictly adheres to UI capabilities.

### 🔌 Advanced Integrations
* **Azure DevOps (ADO):** Pushes finalized stories as PBIs with the configured Area Path, selected Iteration Path, selected story points, formatted bullet points for Acceptance Criteria, and auto-tagging (e.g., `chatgpt`).
* **GitHub RAG Pipeline:** Connects to your repository to "Generate Developer Notes." The system analyzes your codebase to append relevant file paths, code patterns, and implementation steps directly to the story description.

### 🕰️ Version Management
* **Robust Version History:**
    * Automatically snapshots changes to Title, Description, or AC (debounced).
    * **Diff View:** Side-by-side comparison of what changed between versions.
    * **Restore:** Revert to any previous snapshot safely.

### ⚙️ Project Configuration
* **Global Settings:** A centralized modal to manage ADO credentials, GitHub repo links, and Prompting behavior.
* **Knowledge Base:** Supports file uploads (RAG) to give the AI context about your specific project architecture.

---

## 🛠️ Tech Stack

* **Frontend:** React + TypeScript + Vite
* **UI Components:** [shadcn-ui](https://ui.shadcn.com/) + Tailwind CSS + Lucide Icons
* **Prototyping:** Lovable
* **State Management:** In-memory Session Data with History snapshots

---

## 💻 Development Workflow

This project connects to **Lovable** for UI prototyping and logic generation.

* **Visual Editing:** Visit the [Lovable Project Dashboard](https://lovable.dev/projects/00b71058-6b2b-4a5c-8dfa-0b146db9a748) to make UI changes via prompting. Changes made here are automatically committed to this repository.
* **Code Editing:** You can clone this repo and edit locally using your preferred IDE (VS Code, etc.). Pushed changes will be reflected back in the Lovable preview.

---

## 📖 Usage Guide

### 1. Create a Draft Story
On load, the app presents a distraction-free **Raw Input** form. Enter the *Feature Name*, *Description*, and the *Role/Action/Goal* trio. Click **Generate User Story** to expand the workspace.

### 2. Refine Story with AI
Use the **Chat Panel** on the right to request changes (e.g., "Make the acceptance criteria more specific for edge cases").
* Click **Apply Suggestion** to update the story fields instantly.
* Use the **Undo** button if the result isn't what you wanted.

### 3. Developer Context
Click **Generate Developer Notes** to query your linked GitHub repository. The system will append technical implementation details to the story description.

### 4. Push to ADO
Once finalized, use the **Push to ADO** action. This creates a Work Item in your configured Area Path and assigns the creator based on the active user.

---

## ⚡ Getting Started

### Prerequisites
* Node.js v18+
* npm v9+

### Installation

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Enter the directory
cd <YOUR_PROJECT_NAME>

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
