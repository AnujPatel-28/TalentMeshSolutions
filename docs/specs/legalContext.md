# InsForge Support Conversation Context

> **Verification status 2026-07-28** — this file was checked against InsForge's published ToS, DPA
> and Privacy Policy. Result in `26_Legal_DPDP_Compliance_Handoff.md` §9. Two corrections:
>
> 1. **§AI Training is now contractual**, not merely a support statement — the DPA and Privacy
>    Policy both commit to it. Stronger than recorded here.
> 2. **§Backups / §Data Deletion — "not provided" was CORRECT. Do not "fix" it.** InsForge's Privacy
>    Policy publishes a 90-day backup figure and it is tempting, but that document states it *"does
>    not apply to our processing of Customer Data in our capacity as a processor"* — the 90 days
>    describes InsForge's own account and telemetry data, not our project's rows. The DPA, which does
>    govern our data, states **no period**. **The backup retention for our data remains unknown**
>    (doc 26 §9.5 Q-6). Do not publish 90 days.
>
> **§Edge Functions is wrong.** It says the edge server is "deployed in the United States". The live
> function isolate logs report `gcp-asia-southeast1` on most invocations and `gcp-us-east4` on
> others — **both regions, on Google Cloud**, while InsForge's Privacy Policy names AWS as its cloud
> sub-processor. Every other region claim below therefore has to be treated as unconfirmed: the one
> item that could be measured contradicted the chat. Get regions in writing (doc 26 §9.5 Q-2).

> Purpose
>
> This document captures information confirmed by the InsForge support team during conversations about the TalentMesh deployment.
>
> It is intended to provide context for AI when generating legal documents.
>
> This document is **not** a legal document and should not be treated as one.
>
> The AI should verify all legal language against the latest official InsForge documentation, including (but not limited to) the Terms of Service, Privacy Policy, Data Processing Addendum (DPA), Trust Center, and any other official documentation available on the InsForge website.

---

# Project

Company:
TalentMesh Solutions

Product:
TalentMesh AI Recruiting Platform

Backend Platform:
InsForge

---

# Region Clarification

During the conversation, an initial support response stated that the project was based in the Southeast Asia (Singapore) region.

A follow-up clarification explained the deployment by individual services.

The following reflects the clarified deployment information provided by the InsForge team.

---

# Authentication

The InsForge team confirmed that Authentication is deployed in:

- AP-SOUTHEAST-1 (Singapore)

---

# PostgreSQL Database

The InsForge team confirmed that PostgreSQL is deployed in:

- AP-SOUTHEAST-1 (Singapore)

---

# Object Storage

The InsForge team confirmed that Object Storage is deployed in:

- US-EAST-2 (United States)

The support team confirmed that uploaded files stored in Object Storage for the current deployment are stored in AWS US-EAST-2 (United States).

---

# Backups

The InsForge team confirmed that backups are stored in:

- US-EAST-2 (United States)

The support team stated that deleted production data may remain in encrypted backups until backup retention expires.

The exact backup retention period was not provided.

---

# Edge Functions

The support team stated that Edge Function compute depends on deployment configuration.

For the current deployment, the Edge Function server is deployed in the United States.

---

# AI Training

The InsForge team confirmed that customer data is **not** used to:

- train AI models
- improve AI services

---

# Infrastructure Role

The InsForge team confirmed that it is accurate to describe InsForge as:

- Infrastructure Provider
- Data Processor

---

# Support Access

The InsForge team stated that customer data may be accessed in situations such as:

- customer-authorised support requests
- operational investigations
- security investigations

The support team also stated that access is limited to authorised personnel and follows the principle of least privilege.

---

# Data Deletion

The InsForge team explained that when permanent deletion is requested:

- active production data is deleted
- encrypted copies may remain in backups until backup retention expires
- backups are permanently removed after the applicable retention period

The exact backup retention period was not specified.

---

# Documentation

The InsForge team indicated that additional information is available through the official InsForge documentation, including documentation relating to:

- Terms of Service
- Privacy Policy
- Data Processing Addendum (DPA)
- compliance information

---

# Notes for AI

This document is a summary of information confirmed during the support conversation.

When generating legal documents:

- Use this document only as deployment-specific context.
- Verify all legal statements against the latest official InsForge documentation.
- If there is any difference between this conversation and the current official documentation, prefer the official documentation.
- Do not invent infrastructure details, compliance certifications, retention periods, or legal commitments that are not explicitly confirmed.