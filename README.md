# MailEngine

## 📌 Overview

MailEngine is a secure, multi-tenant SaaS platform that combines a customer support helpdesk with an automated mass email communication system. It enables businesses to securely manage customer interactions, automate complaint tracking, and handle high-volume outbound email campaigns efficiently.

The platform is designed with scalability, tenant isolation, and real-time email analytics in mind.

---

# 🚀 Features

### 🔐 Multi-Tenancy

* Complete tenant isolation between business accounts
* Secure separation of clients, tickets, and email data
* Prevents cross-tenant data access

### 📩 Automated Ticketing Pipeline

* Automatically converts incoming customer emails into support tickets
* Matches emails with existing recipients and conversations
* Generates automated acknowledgement and response emails

### 📊 Real-Time Email Tracking

* Tracks email delivery statuses in real time:

  * Sent
  * Opened (via tracking pixels)
  * Bounced
* Integrates with external SMTP relay providers and webhook systems

### 🔑 Secure Authentication

* Passwordless authentication using Google OAuth 2.0
* Eliminates password storage vulnerabilities
* Secure session management

---

# 🛠️ Tech Stack

## Frontend

* **React.js / Next.js** — Dynamic and responsive dashboard interface
* **Tailwind CSS** — Utility-first responsive UI styling
* **Google OAuth 2.0** — Secure authentication and identity verification

## Backend

* **Node.js + Express.js** — REST API handling and webhook processing
* **SMTP Relay Providers (SendGrid / Resend)** — Reliable bulk email delivery infrastructure
* **Webhooks** — Real-time delivery status updates from mail servers

## Database

* **MySQL / PostgreSQL** — Relational database management system
* **UUID v4** — Secure random identifiers for all primary keys
* **LONGTEXT Storage** — Efficient handling of large HTML email templates and bodies

---

# ⚙️ How It Works

1. A business logs into the platform securely using Google OAuth.
2. Incoming customer emails are automatically processed into support tickets.
3. Tickets are linked with existing customers and conversation threads.
4. Businesses can send bulk or individual emails using SMTP relay providers.
5. Webhooks continuously update email statuses in real time.
6. Dashboard analytics provide delivery and engagement insights.

---

# 📦 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/mailengine.git
cd mailengine
```

## 2. Install Dependencies

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd server
npm install
```

---

# 🔑 Environment Variables

Create a `.env` file in the backend directory and configure the following variables:

```env
PORT=5000

DATABASE_URL=your_database_connection_string

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

SENDGRID_API_KEY=your_sendgrid_api_key

JWT_SECRET=your_jwt_secret
```

---

# ▶️ Running the Application

## Start Backend

```bash
npm run server
```

## Start Frontend

```bash
npm run dev
```
