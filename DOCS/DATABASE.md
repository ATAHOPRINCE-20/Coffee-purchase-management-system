# Database Schema & Hierarchy Details

The **Coffee Purchase Management System** uses a sophisticated **Supabase-managed PostgreSQL** database, which is designed for robust **multi-tenancy** and a performance-oriented **pyramid hierarchy**.

## Hierarchical User Strategy ("Pyramid Hierarchy")

A critical component of this system is its multi-layered user structure. Each layer has strictly defined permissions:

1. **Super Admin**: The platform owner. Can manage all companies, subscriptions, and global settings.
2. **Admin**: The company owner. Manages their specific company's settings, seasons, agents, and branch offices.
3. **Agent**: Field operators. Record purchases from farmers, handle advances, and manage daily receipts. Agents can only see data belonging to their company/branch.
4. **Farmer**: The primary suppliers. Farmers can access their own transaction history, but cannot modify records.

### Hierarchy & Security
Row-Level Security (RLS) is used to ensure data isolation. For example, an Agent's database queries are automatically filtered to only include records from their assigned `company_id`.

## Core Database Tables

### 1. Account & Organization
- `profiles`: Core user data (name, role, phone, company_id).
- `companies`: Multi-tenant organization details (name, EUDR number, settings).

### 2. Operation & Inventory
- `seasons`: Definitions of coffee production periods.
- `farmers`: Detailed records of farmers, including location (geolocation for EUDR tracking).
- `purchases`: Records of coffee procurement (quantity, grade, unit price, date).
- `unit_prices`: Dynamic daily price definitions for different coffee grades.

### 3. Financial Flows
- `agent_advances`: Tracking capital issued to agents by admins.
- `advances`: Tracking capital issued to farmers by agents.
- `agent_settlements`: Final reconciliation records for agents.
- `settlements`: Final payment records for farmers.

## Database Integrity
- **Atomic Operations**: Critical financial records (e.g., clearing a farmer's balance) are handled via **Supabase RPC (Remote Procedure Calls)** to ensure that either the entire transaction succeeds or fails completely.
- **Audit Trails**: Every record includes `created_at` and `updated_at` timestamps for accountability.

---
[README.md](file:///f:/JANUARY%202026/Coffee%20Management%20System/DOCS/README.md) | [ARCHITECTURE.md](file:///f:/JANUARY%202026/Coffee%20Management%20System/DOCS/CLOUD_ARCHITECTURE.md)
