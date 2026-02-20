# 🏥 OptiAssist — AI-Powered Optometry Assistant

**Node.js | RAG | LLM Integration | Accessibility | Safety Controls**

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://your-site-link.com)

OptiAssist is a production-style AI feature prototype designed for optometry practice management software. It demonstrates how LLM-powered capabilities can be safely, efficiently, and accessibly integrated into a healthcare product.

This project simulates real-world feature development inside an eye care management system.

---

## Project Overview

OptiAssist implements a Retrieval-Augmented Generation (RAG) pipeline that enables patients or clinic staff to ask natural language questions grounded in clinic documentation (policies, aftercare instructions, insurance guidelines).

The system demonstrates:

- LLM API integration
- Accepts company PDF uploads (admin controlled)
- Chunks & embeds documents
- Vector search–based semantic retrieval
- Context grounding
- Prompt design
- Safety & PII masking
- Accessibility compliance
- Logging and evaluation mechanisms
- Production-style deployment

---

# Secure Company Knowledge Base (New Feature)

OptiAssist now supports secure PDF ingestion, allowing the AI to answer strictly based on official company documents.

## Admin-Controlled Capabilities

### Only authorized administrators (via server-validated passcode) can:

- Upload clinic/company PDF files
- View uploaded documents
- Delete documents (removes all associated embeddings)

### PDF Processing Pipeline

When a PDF is uploaded:

1. SHA-256 file hash generated (prevents duplicate uploads)
2. PDF parsed using pdf-parse
3. Text chunked into manageable segments
4. Embeddings generated using `text-embedding-3-small`
5. Stored in PostgreSQL (Neon) with pgvector
6. Linked to document metadata

This ensures:

- RAG answers are grounded only in uploaded company files
  -No hallucinated external information
  -Controlled knowledge exposure
  -Scalable document ingestion architecture

---

# Stack Used:

- OpenAI API (Chat + Embeddings)
- Retrieval-Augmented Generation (RAG)
- Node.js + Express
- RESTful API
- PostgreSQL (Neon Cloud) + pgvector
- NVDA & VoiceOver (for testing accessibility)

# Deployment

- Render (Backend Hosting)
- Neon PostgreSQL (Managed DB)

---

# AI / LLM Feature Implementation

## 1. Product Features Powered by LLMs

- AI Patient Q&A Assistant grounded in clinic documents
- Context-aware responses using vector search
- Guardrail-controlled answer generation
- Healthcare-safe response constraints (no medical diagnosis)

---

## 2. LLM Integration & API Handling

- Structured prompt design (system + user roles)
- Request/response flow handling
- Latency measurement logging
- Structured response formatting

### Integration Flow

1. Receive user query
2. Mask PII
3. Generate embedding
4. Retrieve relevant documents
5. Construct grounded prompt
6. Call LLM
7. Return safe response

---

## 3. Retrieval-Augmented Generation (RAG)

The assistant prevents hallucination by grounding responses in internal product data.

Implemented:

- OpenAI Embeddings (`text-embedding-3-small`)
- pgvector for semantic search
- Top-K document retrieval

This ensures:

- Model outputs are grounded in clinic policy
- Reduced hallucination risk
- Improved factual accuracy
- Controlled information exposure

---

# Accessibility & Compliance

Accessibility was implemented from the beginning following WCAG and Section 508 standards.

## Accessibility Score

- Lighthouse Accessibility Score: **95+**
- Automated audits performed using:
  - Lighthouse (Chrome DevTools)

---

## Assistive Technology Testing

Manual testing performed using:

- **NVDA (Windows Screen Reader)**
- **VoiceOver (macOS)**

Testing validated:

- Proper screen reader announcements
- Form field label recognition
- Heading navigation consistency
