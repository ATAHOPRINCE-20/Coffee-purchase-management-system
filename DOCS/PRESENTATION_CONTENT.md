# Presentation Content: Coffee Purchase Management System

This document contains detailed content mapped directly to your slide deck structure. You can use this material to populate the text on your slides and as comprehensive speaker notes during your presentation.

## Slide 02: Motivation and Problem Statement
**Subtitle:** Why this system is needed

*This slide sets the stage by identifying the critical pain points in the current coffee supply chain and how our system addresses them.*

**The Four Core Problems (Left Side):**
1. **Lack of Transparency:** Financial transactions between farmers and agents are currently undocumented or recorded in disparate physical ledgers. This lack of a unified digital record leads to disputes, missing funds, and no clear line of accountability.
2. **Financial Inefficiency:** The process of issuing "Capital Flows" (advances to agents) and executing "Settlements" (final payouts to farmers) is manual, slow, and highly prone to accounting errors. This inefficiency ties up capital and delays payments.
3. **Regulatory Pressures (EUDR):** The impending European Union Deforestation Regulation (EUDR) mandates strict traceability. Traditional methods cannot effectively capture or verify the required farmer geolocation and deforestation-free status data.
4. **Disconnected Supply Chain:** Smallholder farmers often operate in isolation from real-time market pricing, while central processors lack visibility into daily field operations and inventory accumulation until the coffee physically arrives.

**The Challenge & Our Solution (Right Side):**
*   **The Challenge:** The coffee supply chain is heavily fragmented. It lacks professional-grade financial tracking, comprehensive data access, and modern compliance tools, which leaves farmers vulnerable and businesses operating inefficiently.
*   **Key Statistics to Highlight:**
    *   **100%** EUDR compliance tracking required to sell in major markets.
    *   **0%** Tolerance for financial data loss or settlement errors.
    *   **100x** Scalability target for our cloud platform to support national-level adoption.
*   **Our Solution:** A multi-tenant, cloud-scale "Coffee Purchase Management System" that provides real-time financial tracking, hierarchical permissions, and automated compliance tools via an intuitive web and mobile interface.

---

## Slide 03: Proposed Solution and Cloud System
**Subtitle:** What we are building and the cloud tools we will use

*This slide breaks down the technical stack into three understandable layers, highlighting our modern, cloud-native approach.*

**Layer 01: Data Ingestion & Interface Layer (The User Experience)**
*This layer focuses on how users interact with the system in the field and at the office.*
*   **React/Vite Dashboards:** Fast, responsive web applications for Super Admins and Admins to monitor global operations.
*   **Mobile-Optimized Views:** Streamlined interfaces specifically designed for Field Agents operating in low-bandwidth environments.
*   **Real-time Entry:** Immediate synchronization of purchase records, advances, and settlements.
*   **Compliance Data Capture:** Built-in tools for agents to capture and verify farmer geolocation data directly from the field for EUDR compliance.

**Layer 02: Cloud Processing Layer (The Engine)**
*This layer represents the backend logic powered by AWS and modern BaaS platforms.*
*   **AWS Lambda:** Utilizing serverless functions for event-driven processing, meaning we only pay for compute when transactions occur, ensuring cost-efficiency.
*   **AWS API Gateway:** Acting as the secure front door to our backend, handling API routing, rate limiting, and initial request validation.
*   **Supabase Edge Functions & RPCs:** Leveraging Remote Procedure Calls (RPCs) to execute complex, multi-step financial logic directly near the database to ensure maximum speed and atomicity.
*   **GoTrue Auth:** Implementing strict, token-based authentication to enforce our "Pyramid Hierarchy" (Super Admin > Admin > Agent > Farmer).

**Layer 03: Storage & Data Layer (The Vault)**
*This layer details how we securely and reliably store critical data.*
*   **PostgreSQL Database:** The enterprise-grade relational database ensuring all financial transactions comply with ACID properties (Atomicity, Consistency, Isolation, Durability).
*   **Amazon S3 / Supabase Storage:** Highly durable object storage used for archiving digital receipts, user documents, and system backups.
*   **Multi-Tenant Segregation:** Database design that ensures data from 'Company A' is cryptographically and logically isolated from 'Company B'.
*   **Row-Level Security (RLS):** Database-level security policies guaranteeing that an Agent can only ever query or modify records belonging to their specific operation.

---

## Slide 04: System Architecture
**Subtitle:** High-level overview of how the cloud system will be structured

*This slide visualizes the flow of data from the end-user through the cloud infrastructure.*

**Left Block: Users & Interfaces**
*   **Super Admins & Admins:** Accessing rich, data-dense web dashboards for reporting and configuration.
*   **Field Agents:** Using simplified, action-oriented mobile views to record purchases and issue cash advances.
*   **Farmers Portal:** A streamlined interface allowing farmers to track their balances and recent sales.

**Middle Block: Cloud Platform (AWS & BaaS)**
*   **Global Content Delivery:** Utilizing AWS CloudFront and Amplify to serve the web application with ultra-low latency worldwide.
*   **Compute & API Logic:** AWS Lambda and API Gateway processing business logic and integrating with third-party services.
*   **Core Relational Data:** The Supabase-managed PostgreSQL instance acting as the absolute source of truth.
*   **Document Storage:** S3 object storage for heavy media and compliance documents.

**Right Block: Core Business Domains**
*   **Financial Settlements:** The complex logic calculating final payouts minus any prior advances.
*   **Capital Advances:** Tracking the flow of money down the hierarchy (Admin -> Agent -> Farmer).
*   **Coffee Purchases:** Ingesting daily intake volumes, categorized by coffee grade and current market price.
*   **EUDR Compliance Data:** Managing geospatial data and risk assessments per farm.

**Key Takeaway (Bottom Footer):** The entire architecture is built on a Multi-Tenant model with a strict "Pyramid Hierarchy" for Role-Based Access Control, ensuring it is both highly scalable and highly available.

---

## Slide 05: Evaluation and Scalability Strategy
**Subtitle:** How we will verify correctness and measure 100X scale performance

*This slide proves we have a plan not just to build the system, but to ensure it works flawlessly under immense load.*

**Top Left: Correctness Testing (Ensuring Data is Right)**
*   **Foreign Key Constraints:** The database physically prevents orphaned records (e.g., a purchase cannot exist without a valid farmer ID).
*   **Atomic Transactions:** All financial operations use SQL `BEGIN/COMMIT`. If a complex settlement fails halfway through, the entire transaction rolls back; no money is lost in limbo.
*   **Immutable Audit Logging:** Every action generates a timestamped, irreversible audit trail detailing who made the change and when.
*   **Automated Test Suites:** Comprehensive unit and integration tests validate core calculating logic before any code reaches production.

**Top Right: Performance Testing (Testing the Breaking Point)**
*   **Load Testing:** Simulating thousands of concurrent agents using tools like K6, JMeter, and AWS X-Ray to stress test the infrastructure.
*   **Peak Load Benchmarking:** Measuring how the API response time degrades as traffic spikes during peak harvest seasons.
*   **SQL Profiling:** Utilizing `Explain Analyze` to locate and optimize slow-running database queries before they impact users.

**Bottom Left: Scalability Measurement (Planning for 100X)**
*   **Baseline Scaling:** Methodically scaling simulated transaction volume up to 100x our initial baseline to observe system behavior.
*   **Serverless Auto-scaling:** Relying on AWS Lambda's architecture to instantly spin up concurrent instances without manual intervention.
*   **Database Indexing:** Proactively adding indices to high-volume query paths (like filtering purchases by date and agent).
*   **Caching Strategy:** Implementing AWS ElastiCache (Redis) to serve frequently accessed, read-heavy data (like daily price lists) without hitting the primary database.

**Bottom Right: Key Metrics (Our Success Criteria)**
*   **API Latency:** Target response time of under 200 milliseconds.
*   **Throughput:** System must comfortably handle over 500 Requests Per Second (RPS).
*   **System Uptime:** Target 99.9% availability.
*   **Data Integrity:** 100% adherence to ACID transactional compliance.

---

## Slide 06: Project Timeline and Milestones
**Subtitle:** Development roadmap using Jira / Git — from ideation to deployment

*This slide demonstrates our professional, phased approach to project management.*

**Phase 1: Concept & MVP (Current phase)**
*   **Core Features:** Building the foundational purchase entry and advance management systems.
*   **User Hierarchy:** Implementing the complex Super Admin -> Admin -> Agent role permissions.
*   **Farmer Management:** Setting up the database structure for farmer profiles.
*   **Database Design:** Finalizing the multi-tenant architecture and Row-Level Security policies.

**Phase 2: Compliance & Optimization**
*   **EUDR Integration:** Building the specific data collection tools required for deforestation compliance.
*   **Mobile Optimization:** Ensuring the application is fast and highly usable for agents on mobile devices in the field.
*   **Automated Reporting:** Generating real-time, dynamic reports for Admins for sales, inventory, and expenses.
*   **UI/UX Polish:** Refining the user interface based on initial field testing feedback.

**Phase 3: Cloud Transition**
*   **AWS Setup:** Configuring AWS Amplify and CloudFront for production hosting.
*   **Environment Parity:** Establishing distinct Development, Staging, and Production environments for safe testing.
*   **CI/CD Pipelines:** Automating the testing and deployment processes using GitHub Actions.
*   **API Integration:** Finalizing the integration between the frontend, Supabase, and custom AWS services.

**Phase 4: 100X Scale Strategy**
*   **Scale Testing:** Executing the comprehensive load testing strategy defined in our evaluation phase.
*   **Database Scaling:** Preparing the database for massive data volume via read replicas if necessary.
*   **Caching Deployment:** Pushing Redis caching layers to production.
*   **Global Launch:** Final deployment, active infrastructure monitoring, and client handoff.

**Key Management Tools (Bottom Bar):** We strictly utilize Jira for managing Epics and 2-week Sprints, alongside Gitflow for branch management and peer-reviewed Pull Requests.
