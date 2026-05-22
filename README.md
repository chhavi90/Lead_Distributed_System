Prowider Mini Lead Distribution System

A FullStack Lead Generation and Distribution System with real-time updates, fair allocation logic and webhook idempotency.

Project Overview

This system manages lead distribution across multiple service providers with:
-> Automatic lead allocation based on business rules
-> Fair distribution using round->robin allocation
-> Real->time dashboard updates via WebSocket
-> Webhook idempotency for safe quota resets
-> Concurrency handling for simultaneous lead creation

Key Features

1. Customer Service Request Form
   -> Route: `/request->service`
   -> Clean, responsive form for submitting service requests
   -> Duplicate prevention: Same phone number cannot request the same service twice
   -> Automatic provider assignment on submission

2. Lead Distribution System
   Mandatory Assignment Rules:
   -> Service 1 → Always assigned to Provider 1
   -> Service 2 → Always assigned to Provider 5
   -> Service 3 → Always assigned to Providers 1 & 4

   Fair Allocation:
   -> Each lead assigned to exactly 3 providers total
   -> Remaining slots distributed using round->robin
   -> Allocation state persists across server restarts
   -> Respects monthly quotas (10 leads per provider)

3. Provider Dashboard
   -> Route: `/dashboard`
   -> Real->time lead updates via WebSocket
   -> Provider selection (8 providers available)
   -> Statistics: quota, received leads, utilization rate
   -> Live lead feed showing newly assigned requests

4. Webhook Simulation & Testing
   -> Route: `/test->tools`
   -> Reset provider quota
   -> Test webhook idempotency (call multiple times with same ID)
   -> Generate 10 concurrent leads
   -> Comprehensive test result logging

Architecture:

Database Schema

      Services (3 total)
      ├── Service 1
      ├── Service 2
      └── Service 3

      Providers (8 total)
      ├── Provider 1->8
      ├── Monthly quota tracking
      └── Fair allocation state

      Leads
      ├── Customer info (name, phone, city)
      ├── Service type
      └── Duplicate prevention unique constraint

      LeadAllocations
      ├── Lead → Provider mappings
      └── Assignment timestamps

      FairAllocationState
      ├── Round->robin index per service
      └── Persists across restarts

      WebhookEvents
      ├── Idempotency key (externalId)
      ├── Quota reset records
      └── Processed flag

Concurrency Handling
-> Database->level unique constraints prevent duplicate allocations
-> Allocation lock mechanism for atomic transactions
-> Webhook idempotency via externalId unique index
-> Fair allocation state atomic updates

Real-Time Communication
-> WebSocket server for live updates
-> Automatic client subscription by provider ID
-> Broadcasting new leads and quota updates
-> Connection status indicator on dashboard

Setup Instructions

Prerequisites
-> Node.js 16+
-> PostgreSQL 12+
-> npm or yarn

1. Clone & Install:
   git clone <repository->url>
   cd prowider->system
   npm install

2. Database Setup:
   Create a PostgreSQL database:
   createdb prowider_db

3. Environment Configuration:
   Create `.env.local`:
   cp .env.example .env.local

   Update with your database URL:
   env:
   DATABASE_URL="postgresql://user:password@localhost:5432/prowider_db"
   NEXT_PUBLIC_API_URL="http://localhost:5000"
   NODE_ENV="development"

4. Run Migrations:
   npm run migrate

5. Seed Database:
   npm run seed

   This creates:
   -> 3 Services (Service 1, 2, 3)
   -> 8 Providers with 10 leads/month quota
   -> Fair allocation state for each service

6. Start Development Server:
   npm run dev

Server runs at `http://localhost:5000`:
Usage Guide

Customer Flow

1.  Visit `/request->service`
2.  Fill form with details
3.  Submit request
4.  System automatically assigns to 3 providers

Provider Flow

1.  Visit `/dashboard`
2.  Select your provider number
3.  Real->time leads appear as assigned
4.  Monitor quota utilization

Testing Flow

1.  Visit `/test->tools`
2.  Select provider
3.  Run tests:
    -> Reset quota
    -> Test idempotency (3x calls)
    -> Generate 10 concurrent leads
4.  View detailed test results

Algorithm Details:
Fair Allocation Algorithm

Step 1: Mandatory Assignment
-> Assign required providers for service type
-> Check if they have remaining quota
-> Fail allocation if mandatory provider unavailable

Step 2: Fair Slot Distribution
-> Get list of optional providers for service
-> Use round->robin index from database
-> Rotate through providers: `nextIndex = (currentIndex + 1) % poolSize`
-> Only select providers with quota
-> Update round->robin state after assignment

Example -> Service 1:
Mandatory: [Provider 1]
Optional Pool: [Provider 2, 3, 4]
Allocation: [Provider 1, Provider 2, Provider 3]

Next allocation uses index 1 (Provider 3)
Then index 2 (Provider 4)
Then index 0 (Provider 2) -> wraps around

Persistence:
-> Round->robin state stored in `FairAllocationState` table
-> Survives server restarts
-> Ensures consistency across deployments

Concurrency Safety:
Unique Constraints:
-> Prevent duplicate leads
UNIQUE (phoneNumber, serviceId)

-> Prevent duplicate allocations
UNIQUE (leadId, providerId)

-> Prevent duplicate webhooks
UNIQUE (externalId)

Atomic Operations:
-> Lead creation and allocation in single transaction
-> Quota checks before assignment
-> Allocation state updates atomically

Webhook Idempotency
Mechanism:

1.  Client provides `webhookId` (unique identifier)
2.  Store in `WebhookEvent.externalId`
3.  Check for existing event before processing
4.  If found and processed, return success (idempotent)
5.  If not found, process and mark as processed

Benefits:
-> Safe retry mechanism
-> No duplicate quota resets
-> Exactly->once semantics

Project Structure:

      LEAD_DISTRIBUTION_SYSTEM/
      ├── pages/
      │ ├── api/
      │ │ ├── leads.ts
      │ │ ├── services.ts
      │ │ ├── provider/[id].ts  
      │ │ └── webhook/quota-reset.ts
      │ ├── request-service.tsx
      │ ├── dashboard.tsx
      │ ├── test-tools.tsx
      │ └── _app.tsx
      ├── lib/
      │ ├── allocation.ts
      │ └── websocket.ts
      ├── styles/
      │ ├── form.module.css
      │ ├── app.module.css
      │ ├── globals.css
      │ ├── home.module.css
      │ ├── dashboard.module.css
      │ └── test-tools.module.css
      ├── prisma/
      │ └── schema.prisma
      ├── scripts/
      │ ├── migrate.js
      │ └── seed.js
      ├── server.js
      ├── next.config.js
      ├── package.json
      └── .env

Testing:

Manual Test Cases:
Test 1: Duplicate Prevention

1.  Submit lead: Phone 9999999999, Service 1
2.  Submit lead: Phone 9999999999, Service 1 (again)
3.  Expected: Second submission fails with 409 error
4.  Submit lead: Phone 9999999999, Service 2
5.  Expected: Success (different service is allowed)

Test 2: Fair Allocation

1.  Create 3 leads for Service 1
2.  Check /test->tools → Generate Leads
3.  Verify each provider gets leads in round->robin order
4.  Restart server
5.  Create another lead
6.  Verify round->robin continues from last position

Test 3: Concurrency

1.  Use /test->tools → Generate 10 Leads Simultaneously
2.  Monitor that all 10 leads are created successfully
3.  Verify allocations are correct
4.  Check no allocation duplication

Test 4: Real->Time Updates

1.  Open Provider 1 dashboard
2.  Open /request->service in new tab
3.  Submit lead for Service 1
4.  Expected: Dashboard updates without refresh within 2 seconds
5.  Check WebSocket connection indicator shows "Connected"

Test 5: Webhook Idempotency

1.  Go to /test->tools
2.  Click "Call Webhook 3x (Same ID)"
3.  Expected: All 3 calls succeed
4.  Provider quota should be 10 (not 30)
5.  Verify processed flag in WebhookEvents table

Error Handling

The system gracefully handles:
-> Database connection failures
-> WebSocket disconnections (automatic reconnect)
-> Duplicate lead submissions
-> Quota exhaustion
-> Concurrent allocation conflicts
-> Invalid service/provider IDs
-> Network failures

Performance Considerations
-> Database indexes on frequently queried fields
-> Connection pooling via Prisma
-> WebSocket efficient broadcasting (only to relevant clients)
-> Fair allocation O(n) complexity where n = pool size
-> Quota checks using indexed queries

Security
-> Input validation on all API endpoints
-> SQL injection prevention via Prisma ORM
-> CSRF protection ready (can add next->csrf)
-> No sensitive data in WebSocket messages
-> Rate limiting ready for webhook endpoints

Common Issues & Solutions
WebSocket Connection Failed
-> Check custom server is running (not next dev)
-> Verify browser allows WebSocket connections
-> Check firewall allows port 5000

Migrations Failed
-> Ensure PostgreSQL is running
-> Check DATABASE_URL is correct
-> Run: `npx prisma migrate reset` (resets database)

Seed Failed
-> Database might already have data
-> Run: `npx prisma db seed` to retry

API Endpoints
Leads
-> `POST /api/leads` -> Create lead (triggers allocation)
-> `GET /api/leads` -> List all leads

Services
-> `GET /api/services` -> List services

Provider
-> `GET /api/provider/[id]` -> Get provider data & assigned leads

Webhook
-> `POST /api/webhook/quota->reset` -> Reset quota (idempotent)

Deployment:
Railway/Heroku

# Set environment variable

heroku config:set DATABASE_URL=postgresql://...

# Deploy

git push heroku main

Vercel + Neon (PostgreSQL)

# Connect Neon database

vercel env add DATABASE_URL

# Deploy

vercel deploy

Note: Custom server (server.js) means you'll need a platform that supports custom servers (Railway, Render, Fly.io, VPS).

Support

For issues or questions:

1.  Check test->tools page for debugging
2.  Review browser console for client errors
3.  Check server logs for backend errors
4.  Verify database connectivity

License:
MIT

Built with: Next.js, PostgreSQL, Prisma, WebSocket
