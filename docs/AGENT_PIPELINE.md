# ASCEND — 6-Agent Statutory Compliance Audit Pipeline

> **Platform:** ASCEND — Financial Compliance Intelligence Platform
> **Purpose:** Automated statutory audit of government proposals and financial workflows against official Dubai laws
> **Laws Covered:** 7 enacted Dubai Government laws · 93 real articles

---

## Overview

When a proposal document or process is submitted for audit, ASCEND runs it through a sequential pipeline of **6 AI agents**. Each agent has a distinct, non-overlapping role. Together they produce a complete statutory compliance report with citations, gap analysis, compliance verdict, corrective actions, and missing KPIs.

The pipeline is **fully automated**, runs in the background after upload, and streams its progress live to the frontend via Server-Sent Events (SSE).

---

## Pipeline Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     INPUT (Proposal / Process)                   │
│         PDF · DOCX · TXT · MD   →   Clause Extraction           │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 1 — Research Agent                                        │
│  Vector search → retrieves matching law articles per clause      │
│  Validates citations in code (hallucinations rejected)           │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 6 — Review Agent  (Quality Gate #1)                       │
│  Reads Research output → decision: ACCEPT or REVISE              │
│  If REVISE → Agent 1 reruns automatically                        │
└──────────────┬───────────────────────────────────────────────────┘
               │ (accepted)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 2 — Gap Analysis Agent                                    │
│  Identifies: Missing Steps · Deviations · Risks                  │
│  Severity tagged: HIGH · MEDIUM · LOW · article-cited            │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 6 — Review Agent  (Quality Gate #2)                       │
│  Reads Gap Analysis output → decision: ACCEPT or REVISE          │
│  If REVISE → Agent 2 reruns automatically                        │
└──────────────┬───────────────────────────────────────────────────┘
               │ (accepted)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 3 — Compliance Status Agent                               │
│  Applies hardcoded rubric → COMPLIANT / PARTIAL / NON-COMPLIANT  │
│  Generates written justification with severity breakdown         │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 4 — Corrective Action Agent                               │
│  Produces step-by-step remediation for every gap finding         │
│  Each action linked back to a specific finding + article number  │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT 5 — Missing KPI Agent                                     │
│  Flags performance indicators required by law but absent         │
│  Linked to gap findings and corrective actions                   │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     OUTPUT — Full Compliance Report              │
│  5 Sections · Persisted to PostgreSQL · Streamable to frontend   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Agent Details

### Agent 1 — Research Agent

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/research.py` |
| **Prompt** | `research_v1` |
| **LLM** | Full model (`gemini-2.5-flash`) |
| **Input** | Proposal clauses + all 93 law articles from DB |
| **Output** | `ResearchOutput` — list of `RelevantSection` objects |

**What it does:**

1. Takes every extracted clause from the uploaded document.
2. Runs a **vector similarity search** (pgvector + embeddings) against all seeded law articles in the database.
3. Retrieves the top-k most semantically relevant articles per clause.
4. Asks the LLM to identify which articles apply to which clauses, and what the **key obligation** of each article is.
5. **Validates all citations in code** — if the LLM references a `node_id` that was not actually retrieved, that citation is rejected before the output is passed forward. This prevents hallucinated law references.

**Output structure:**
```
RelevantSection:
  - node_id        → database ID of the law article
  - path_text      → "Law No. (1) of 2016 > Article 15: General Budget Circular"
  - text           → full article text
  - key_obligation → what the article requires
  - citations      → list of article references
```

---

### Agent 2 — Gap Analysis Agent

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/gap_analysis.py` |
| **Prompt** | `gap_analysis_v1` |
| **LLM** | Full model (`gemini-2.5-flash`) |
| **Input** | Research output (matched law articles) + original proposal clauses |
| **Output** | `GapAnalysis` — three categorised finding lists |

**What it does:**

1. Takes the matched law sections from Agent 1 and the original proposal.
2. For every matched article obligation, checks whether the proposal satisfies it.
3. Produces three types of findings:

| Finding Type | Meaning |
|-------------|---------|
| **Missing Steps** | Law requires this — proposal does not mention it at all |
| **Deviations** | Proposal does something that contradicts the law |
| **Risks** | Proposal is ambiguous — could lead to non-compliance if not clarified |

4. Every finding is tagged with:
   - `severity` — `high` / `medium` / `low`
   - `finding_key` — unique identifier (e.g. `GAP-001`)
   - `citations` — specific article numbers it violates
5. **Code validates citations** — findings that cite articles not in the research output are dropped.

**Output structure:**
```
GapAnalysis:
  - missing_steps  → [Finding, ...]
  - deviations     → [Finding, ...]
  - risks          → [Finding, ...]

Finding:
  - finding_key   → "GAP-001"
  - kind          → "missing_step" | "deviation" | "risk"
  - text          → human-readable description of the gap
  - severity      → "high" | "medium" | "low"
  - citations     → [Citation(article_no, law_code, text), ...]
```

---

### Agent 3 — Compliance Status Agent

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/compliance_status.py` |
| **Prompt** | `compliance_status_v1` |
| **LLM** | Full model (`gemini-2.5-flash`) |
| **Input** | All gap findings from Agent 2 |
| **Output** | `ComplianceStatus` — verdict + severity counts + justification |

**What it does:**

1. Counts all findings by severity from Agent 2's output.
2. Applies a **deterministic rubric in Python code** (the LLM cannot override this):

| Condition | Verdict |
|-----------|---------|
| Any `HIGH` severity finding | `NON_COMPLIANT` |
| Only `MEDIUM` or `LOW` findings | `PARTIALLY_COMPLIANT` |
| Zero findings | `COMPLIANT` |

3. The LLM is asked only to **write a justification** for the pre-determined status — it cannot change the verdict itself.
4. This design prevents the AI from being "generous" with compliance scores.

**Output structure:**
```
ComplianceStatus:
  - status                → "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT"
  - justification         → written explanation
  - high_severity_count   → integer
  - medium_severity_count → integer
  - low_severity_count    → integer
```

---

### Agent 4 — Corrective Action Agent

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/corrective_action.py` |
| **Prompt** | `corrective_action_v1` |
| **LLM** | Full model (`gemini-2.5-flash`) |
| **Input** | All gap findings from Agent 2 (with severity + citations) |
| **Output** | List of `CorrectiveAction` objects |

**What it does:**

1. Takes every gap finding (missing step, deviation, risk).
2. For each finding, generates a **concrete, actionable remediation plan**.
3. Each corrective action contains:
   - Which finding it addresses (`addresses_finding_key`)
   - Ordered list of remediation steps
   - Referenced law articles that mandate the fix
4. Actions that reference a non-existent finding key are rejected in code.

**Output structure:**
```
CorrectiveAction:
  - action_key               → "CA-001"
  - addresses_finding_key    → "GAP-001"
  - steps                    → ["Step 1: ...", "Step 2: ...", ...]
  - referenced_articles      → ["Article 15, Law No. (1) of 2016", ...]
```

**Example:**
If GAP-001 is *"Proposal does not mention submission of monthly financial reports"*, the corrective action would be:
> - Step 1: Add a clause committing to monthly reporting to DOF by month-end.
> - Step 2: Designate the Head of Accounting as the responsible signatory.
> - Step 3: Reference Article 43, Law No. (1) of 2016 in the proposal body.

---

### Agent 5 — Missing KPI Agent

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/missing_kpi.py` |
| **Prompt** | `missing_kpi_v1` |
| **LLM** | Full model (`gemini-2.5-flash`) |
| **Input** | Gap findings (Agent 2) + Corrective Actions (Agent 4) |
| **Output** | List of `MissingKPI` objects |

**What it does:**

1. Reviews the gaps and proposed corrective actions.
2. Identifies **statutory performance indicators** required by the laws that are absent from the proposal.
3. For example, Law No. (1) of 2016 Article (16) mandates the use of **outcome measurement indicators** in budget preparation — if a proposal does not define measurable KPIs, this agent flags exactly which ones are missing and why.
4. Each missing KPI is linked back to the finding that triggered it.
5. KPIs referencing non-existent findings are rejected in code.

**Output structure:**
```
MissingKPI:
  - kpi_key                  → "KPI-001"
  - addresses_finding_key    → "GAP-002"
  - description              → "Quarterly budget utilisation rate vs. approved ceiling"
  - statutory_basis          → "Article 16, Law No. (1) of 2016"
  - recommended_target       → ">=90% utilisation within each quarter"
```

---

### Agent 6 — Review Agent (Quality Gate)

| Property | Detail |
|----------|--------|
| **File** | `backend/app/agents/review.py` |
| **Prompt** | `review_v1` |
| **LLM** | Fast model (lightweight config) |
| **Input** | JSON output of Agent 1 or Agent 2 |
| **Output** | `ReviewDecision` — `accept` or `revise` |

**What it does:**

1. Runs **twice** inside the pipeline — after Agent 1 (Research) and after Agent 2 (Gap Analysis).
2. Acts as a **self-critique quality gate**: reads the previous agent's full output as JSON and evaluates:
   - Is the output complete and coherent?
   - Are citations present and specific?
   - Does the analysis cover all provided activities?
3. Returns one of two decisions:
   - `accept` — output is good, pipeline continues
   - `revise` — output is weak, **the previous agent reruns** with the same inputs
4. Uses a **faster, cheaper LLM** since it only judges, not generates content.
5. Prevents sloppy or incomplete intermediate outputs from corrupting downstream agents.

> **Why this matters:** Without the Review Agent, if Agent 1 returns sparse research, Agent 2 would perform gap analysis on incomplete law coverage — producing false negatives (missed compliance gaps). The Review Agent acts as a safeguard against this.

**Output structure:**
```
ReviewDecision:
  - decision    → "accept" | "revise"
  - reason      → brief explanation
```

---

## Final Report Structure

After all 6 agents complete, the system assembles a **5-section compliance report** persisted to PostgreSQL and rendered in the frontend:

| Section | Source Agent | Content |
|---------|-------------|---------|
| **Part 1** | Agent 1 — Research | Relevant law sections matched to the proposal |
| **Part 2** | Agent 2 — Gap Analysis | All findings: missing steps, deviations, risks with citations |
| **Part 3** | Agent 3 — Compliance Status | Overall verdict + severity breakdown + justification |
| **Part 4** | Agent 4 — Corrective Actions | Remediation steps for every identified gap |
| **Part 5** | Agent 5 — Missing KPIs | Statutory KPIs absent from the proposal |

---

## Laws the Agents Check Against

All 7 laws are seeded from the official `ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx` and stored as **93 real articles** in PostgreSQL (pgvector):

| Code | Law | Articles |
|------|-----|:--------:|
| `LAW_NO_1_2016` | Law No. (1) of 2016 — Financial Regulations of the Government of Dubai | 32 |
| `EC_RES_5_2021` | Executive Council Resolution No. (5) of 2021 — Implementing Bylaw of Law No. (1) of 2016 | 18 |
| `LAW_NO_12_2020` | Law No. (12) of 2020 — Contracts and Warehouse Management | 10 |
| `LAW_NO_4_2018` | Law No. (4) of 2018 — Financial Audit Authority | 4 |
| `LAW_NO_8_2022` | Law No. (8) of 2022 — Public Debt | 12 |
| `LAW_NO_5_1995` | Law No. (5) of 1995 — Establishing the Department of Finance | 10 |
| `LAW_NO_15_2025` | Law No. (15) of 2025 — General Budget Cycle 2026–2028 and General Budget 2026 | 7 |
| **Total** | | **93** |

---

## Key Design Decisions

### 1. Citations are validated in code, not just by AI
Every agent that produces citations runs a Python-level check to verify the referenced `node_id` or `finding_key` actually exists in the data passed to it. Hallucinated references are silently dropped — the report only contains verifiable, traceable citations.

### 2. Compliance verdict uses a hardcoded rubric
The compliance status is computed deterministically by Python code based on finding severity counts. The LLM cannot inflate the compliance score. This ensures auditability and repeatability.

### 3. Review Agent prevents error propagation
The self-review loop (Agent 6) means a weak output at Research or Gap Analysis is caught and corrected before it propagates. The pipeline sacrifices a small amount of speed for significantly higher output quality.

### 4. Agents are stateless and composable
Each agent receives only what it needs (previous agent's structured output) and returns a typed Pydantic schema. This makes each agent independently testable and replaceable without affecting the rest of the pipeline.

### 5. Dynamic clause extraction (5-strategy cascade)
The document parser uses a 5-strategy cascade to segment any uploaded document into compliance-checkable clauses:

| Priority | Strategy | Example |
|----------|----------|---------|
| 1 | Numbered/lettered clauses | `1.` / `a)` / `Article 5` / `Section 3` |
| 2 | Heading-delimited sections | `# Budget Allocation` |
| 3 | Bullet list items | `• All contracts must be...` |
| 4 | Sentence-boundary splitting | Free-form prose paragraphs |
| 5 | Line-by-line fallback | Any remaining lines ≥ 30 chars |

Up to **50 clauses** per document are extracted and checked against all 93 statutory articles.

---

## Source Files Reference

| File | Role |
|------|------|
| `backend/app/workflow/graph.py` | Pipeline orchestrator — runs all 6 agents in sequence |
| `backend/app/agents/research.py` | Agent 1 — Research |
| `backend/app/agents/gap_analysis.py` | Agent 2 — Gap Analysis |
| `backend/app/agents/compliance_status.py` | Agent 3 — Compliance Status |
| `backend/app/agents/corrective_action.py` | Agent 4 — Corrective Actions |
| `backend/app/agents/missing_kpi.py` | Agent 5 — Missing KPIs |
| `backend/app/agents/review.py` | Agent 6 — Review / Quality Gate |
| `backend/app/agents/schemas.py` | All Pydantic output schemas for every agent |
| `backend/app/agents/validators.py` | Citation + finding + KPI validation logic |
| `backend/app/api/proposals.py` | Proposal upload endpoint + clause segmentation |
| `backend/app/ingestion/seed_laws_from_docx.py` | Law seeder — parses DOCX into 93 DB articles |
| `backend/app/retrieval/service.py` | Vector similarity search (pgvector) |

---

*Document generated from source code analysis of the ASCEND platform.*
*Last updated: October 2026*
