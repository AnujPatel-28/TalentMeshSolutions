# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---
The project is inside the Talentmesh-demo folder
---
You are acting as a Principal Security Engineer, Staff Next.js Architect, and Authentication Specialist.

Your responsibility is NOT to review code casually.

Your responsibility is to determine whether this authentication system is actually production-ready.

Do not assume documentation is correct.
Do not assume comments are correct.
Do not assume implementation matches architecture.

Everything must be validated against the source code.

If documentation exists inside the /docs folder, use it only as architectural intent.

Then verify whether the implementation actually follows it.

If the documentation and implementation differ,
explicitly point it out.

Never trust documentation without verification.

----------------------------------------
PROJECT CONTEXT
----------------------------------------

Stack

- Next.js (App Router)
- TypeScript
- InsForge Backend
- OAuth Authentication
- Google Sign In
- LinkedIn OAuth
- Email Authentication
- Session based authentication
- Multi-tenant Recruitment Platform

This system will be deployed to production.

Your task is to determine whether this authentication architecture is production ready.

---

----------------------------------------
AUDIT REQUIREMENTS
----------------------------------------

I DO NOT want assumptions.

Every finding must include:

1. Evidence
2. File
3. Function
4. Why it matters
5. Risk level
6. Recommended fix

If something cannot be verified,
state that clearly.

Never guess.

---

Spend as much time as necessary understanding the architecture before making any judgments.

Read the relevant authentication code first.

Then read the documentation.

Then compare documentation with implementation.

Do not start writing findings until you understand the complete authentication lifecycle.

If you discover additional areas worth auditing that I did not mention, include them.

---

You are working on TalentMesh recruitment SaaS platform targeting the first Indian market and internaationl. This project focuses specifically on designing and documenting the Recruiter Portal and Company Management modules for implementation.

Stack:- next.js and insforge and other things check it out 

---

Documentation Standards

Every implementation document MUST follow this structure for EVERY task/change:

FieldDescriptionServer-side changesExact files, functions, and code changes on the serverClient-side changesExact components, hooks, and UI changes on the clientImpact if changedWhat improves or becomes possibleImpact if not changedWhat breaks, degrades, or remains blockedReason for changeBusiness or technical justificationDeploy priorityP0 (blocker) / P1 (critical) / P2 (important) / P3 (nice-to-have)

Output Rules


Precision over brevity. Every doc must be detailed enough that Claude Opus 4.8 or Sonnet 4.6 can implement it without clarifying questions.
Code blocks are mandatory for schemas, types, interfaces, API contracts, and state machines.
No vague instructions. Never write "add appropriate validation" — specify the exact validation rules.
Cross-reference documents by filename (e.g., "See 04_State_Machines.md").
Indian market context — INR pricing, GSTIN/CIN fields for companies, Indian phone formats (+91), IT Act compliance considerations, GST for billing.

and aalso keep ing in mind for future international 
---

Suggestion Protocol

If you identify improvements beyond what's specified in 13_Admin_Portal_System_Documentation.md, 12_Admin_Portal_Functional_And_Calculation_Audit , :


Mark them clearly with [SUGGESTION]
Include rationale and trade-offs
Keep them separate from core spec — never mix suggestions into required implementation

File Output Structure

All documentation goes into Admin_ArchitecturAnd Implementation_Doc/:

Admin_ArchitecturAnd Implementation_Doc/
├── 01_Admin_Portal_Auth_Security_Audit_Report.md
├── 02_Admin_Portal_Schema_And_Database_Design.md
├── 03_Admin_Portal_API_Routes_And_Endpoints.md
├── 04_Admin_Portal_State_Machines_And_Business_Logic.md
├── 05_Admin_Portal_UI_Components_And_Pages.md
├── 06_Admin_Portal_Recruiter_Portal_Architecture.md
├── 07_Admin_Portal_Company_Management_Architecture.md
└── 08_Admin_portal_Implementation_Execution_Plan.md

We wanted to make the Admin portal so that it can be used for following purposes: as administaring the whole candiate and company and recuter and manage the candiaate side and admin side working , help the candidate aand recuter is they can not mannuly change the things , redisgin it making the recuter side and candidate side 
