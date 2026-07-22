# MailEngine

## Overview

MailEngine is a multi-tenant customer communication platform that combines a helpdesk ticketing system with bulk email campaign management. The platform enables businesses to manage customer inquiries, automate ticket creation from incoming emails, and send outbound email campaigns through Gmail SMTP.

The system is designed around tenant isolation, automated email processing, and centralized customer communication workflows.

---

## Features

### Multi-Tenant Architecture

* Tenant-level data isolation
* Separate customers, tickets, and email records for each business account
* Secure account-based access control

### Automated Helpdesk System

* Monitors incoming emails using IMAP
* Converts customer complaint emails into support tickets
* Automatically stores ticket history and conversation records
* Generates draft responses for support teams

### Bulk Email Campaigns

* Send personalized outbound emails to recipients
* Gmail SMTP integration using Nodemailer
* Centralized email dispatch service

### Ticket Approval Workflow

* Support agents review generated responses
* Approved replies are sent directly to customers
* Ticket status tracking and resolution management

### Secure Authentication

* Google OAuth 2.0 login
* Passwordless authentication
* Secure user onboarding and account management

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Google OAuth 2.0

### Backend

* Node.js
* Express.js
* Nodemailer
* IMAP Email Processing

### Database

* MySQL
* UUID-based identifiers
* Relational schema for accounts, tickets, recipients, and emails

---

## System Workflow

1. Users authenticate through Google OAuth.
2. The IMAP worker periodically scans incoming emails.
3. Complaint emails are converted into support tickets.
4. Customer information is linked with existing records.
5. Support agents review pending tickets.
6. Approved responses are delivered through Gmail SMTP.
7. Ticket and email activity are stored for future reference.

---

## Key Technologies Used

* Node.js
* Express.js
* MySQL
* Nodemailer
* Gmail SMTP
* IMAP
* Google OAuth 2.0
* UUID
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