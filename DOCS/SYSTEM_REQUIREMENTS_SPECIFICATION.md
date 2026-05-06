# Software Requirements Specification (SRS)
## Coffee Purchase Management System

---

### 1. Introduction

#### 1.1 Purpose
The purpose of this document is to detail the software requirements for the Coffee Purchase Management System. This system is designed as a cloud-native, multi-tenant platform to manage the end-to-end coffee procurement process, bridging the gap between smallholder farmers, field agents, and centralized processing companies.

#### 1.2 Problem Statement
The current coffee supply chain faces significant challenges:
- **Lack of Transparency:** Financial transactions are undocumented or recorded in disparate physical ledgers, leading to disputes and loss of funds.
- **Financial Inefficiency:** Issuing "Capital Flows" (advances) and executing "Settlements" (final payouts) are manual, slow, and error-prone.
- **Regulatory Pressures (EUDR):** The impending European Union Deforestation Regulation (EUDR) mandates strict traceability, which traditional methods cannot effectively capture.
- **Disconnected Supply Chain:** A lack of real-time visibility into daily field operations and inventory accumulation.

#### 1.3 Proposed Solution
A multi-tenant, cloud-scale platform providing real-time financial tracking, hierarchical permissions, and automated compliance tools via intuitive web and mobile interfaces.

---

### 2. Overall Description

#### 2.1 User Characteristics (Roles & Permissions)
The system employs a strict "Pyramid Hierarchy" with Role-Based Access Control (RBAC):
- **Super Admin (Platform Owner):** Can manage all companies, subscriptions, and system-wide global settings.
- **Admin (Company Owner):** Manages specific company configuration, coffee seasons, branch offices, and agents.
- **Agent (Field Operator):** Interacts directly with farmers. Requires a mobile-optimized interface to record purchases, issue advances, and verify farmer geolocation data. Restricted to viewing data from their assigned company.
- **Farmer (Supplier):** Can securely access a portal to track transaction history, outstanding balances, and recent sales, but cannot modify records.

#### 2.2 Operating Environment
- **Front-end:** Web-based responsive dashboards (React/Vite). Field agents interact via mobile-optimized views functional in low-bandwidth environments.
- **Back-end:** Serverless architecture powered by AWS (Lambda, API Gateway) and Supabase Edge Functions.
- **Database:** PostgreSQL (Supabase-hosted) ensuring ACID compliance.

---

### 3. Functional Requirements

#### 3.1 User & Organization Management
- **FR1.1:** The system shall support a multi-tenant architecture, securely isolating data between different organizations (companies).
- **FR1.2:** The system shall enforce token-based authentication and restrict access based on the pyramid role hierarchy (Super Admin > Admin > Agent > Farmer).
- **FR1.3:** Admins shall be able to register new Agents and assign them to specific branch locations.

#### 3.2 Coffee Procurement & Inventory Control
- **FR2.1:** The system shall allow Admins to define dynamic daily unit prices for different coffee grades (e.g., Grade A, Grade B, Parchment, Cherry).
- **FR2.2:** Agents shall be able to record coffee intakes with details including Farmer ID, quantity, grade, and current unit price.
- **FR2.3:** The system shall generate digital, immutable receipts for all purchase transactions.

#### 3.3 Financial Management & Settlements
- **FR3.1 (Capital Flow):** The system shall allow Admins to issue and track financial advances (Capital) passed down to Agents.
- **FR3.2 (Farmer Advances):** The system shall allow Agents to issue partial upfront cash advances to Farmers against future deliveries.
- **FR3.3 (Reconciliation):** The system must compute final settlements for both Farmers and Agents automatically, deducting any prior cash balances or advances from the total delivery value.
- **FR3.4:** All financial operations must process as atomic transactions, rolling back completely if any part fails to maintain absolute ledger integrity.

#### 3.4 Regulatory Compliance (EUDR)
- **FR4.1:** The system shall provide built-in tools for Agents to capture exact geolocation coordinates of farmer plots.
- **FR4.2:** The system must record and map deforestation-free verification statuses per farm for strict EUDR traceability compliance.

#### 3.5 Automation & Reporting
- **FR5.1:** The system shall compile and display real-time dashboard reports for Admins, summarizing daily intake volume, aggregated expenses, and active advances.

---

### 4. Non-Functional Requirements

#### 4.1 Performance & Scalability
- **NFR1.1:** The cloud infrastructure must scale to 100x the initial baseline, accommodating thousands of concurrent users and millions of transactions.
- **NFR1.2:** System APIs shall maintain a target latency response time of under 200 milliseconds.
- **NFR1.3:** The backend must comfortably handle load spikes over 500 Requests Per Second (RPS) during peak harvest seasons.

#### 4.2 Security & Data Integrity
- **NFR2.1:** The database must enforce Row-Level Security (RLS) policies cryptographically stopping users from accessing extra-tenant records.
- **NFR2.2:** Foreign Key Constraints and database-level safeguards must strictly prevent orphaned records (e.g., stopping a purchase creation if the farmer ID is invalid).
- **NFR2.3:** The system must maintain an immutable audit trail for all transactional modifications, logging timestamps and user identities.

#### 4.3 Reliability & Availability
- **NFR3.1:** The system architecture targets 99.9% uptime.
- **NFR3.2:** 100% adherence to ACID properties is required for all stored financial data.
- **NFR3.3:** The system must incorporate Redis-based caching layers to reduce database stress during read-heavy operations without risking data freshness.

#### 4.4 Usability
- **NFR4.1:** The Agent interface must be specialized for use on mobile devices in potentially extreme conditions (harsh glare, low-connectivity). 
- **NFR4.2:** Form submissions must be extremely robust, preventing double-billing or accidental duplicate entries via idempotency keys or explicit UI blocking.
