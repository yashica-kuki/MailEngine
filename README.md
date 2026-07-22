# MailEngine 🚀

A secure, multi-tenant full-stack mass email communicator and helpdesk ticketing application. MailEngine enables businesses (Accounts) to manage client profiles, seamlessly track inbound customer complaints, instantiate isolated support threads, and safely orchestrate high-volume outbound email dispatches.

---

## 🛠️ Tech Stack

- **Frontend:** React.js / Next.js, Tailwind CSS
- **Authentication:** Google OAuth 2.0 (Passwordless Identity Management)
- **Backend:** Node.js (Express.js) / Asynchronous Event Pipeline
- **Database:** MySQL / PostgreSQL (Relational Architecture)
- **Database Core:** UUID (v4) Staging, Transactional Integrity Engine
- **Email Infrastructure:** Third-Party SMTP Relay (SendGrid / Resend) via Webhooks

---

## 📐 Database Architecture & Multi-Tenancy

The application relies on an optimized, 4-table relational database schema engineered to enforce strict data isolation between corporate accounts while maintaining zero data redundancy.

### Entity Relationships

- **Accounts:** Holds secure profile structures for platform tenants logging in via Google OAuth.
- **Recipients:** Manages isolated customer portfolios mapped specifically to a tenant's `account_id`.
- **Tickets:** Instantiates support lifecycles tracking issue statuses (`Open`/`Resolved`).
- **Mail:** Logs granular communication histories, categorizing payloads via `sender_type` (`customer` or `agent`) to handle single-thread interactions natively.