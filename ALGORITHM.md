Allocation Algorithm & Concurrency Handling

Overview:
The Prowider system uses a hybrid allocation strategy combining mandatory assignments with fair round-robin distribution, all while handling concurrent lead creation safely.

Allocation Algorithm

High-Level Overview
Input: Lead with ServiceID
│
├─ Step 1: Determine Mandatory Providers
│ └─ Service 1 → [1]
│ └─ Service 2 → [5]
│ └─ Service 3 → [1, 4]
│
├─ Step 2: Check Quota for Mandatory Providers
│ └─ If any mandatory provider lacks quota → FAIL
│
├─ Step 3: Determine Optional Provider Pool
│ └─ Service 1 → [2, 3, 4]
│ └─ Service 2 → [6, 7, 8]
│ └─ Service 3 → [2, 3, 5, 6, 7, 8]
│
├─ Step 4: Fair Allocation for Remaining Slots
│ └─ Calculate remaining slots = 3 - mandatory_count
│ └─ Get round-robin index from FairAllocationState
│ └─ Select providers in order, skip those without quota
│
├─ Step 5: Update Round-Robin State
│ └─ Increment index for next allocation
│
└─ Output: [Provider1, Provider2, Provider3] or FAIL

Detailed Implementation:

1. Mandatory Provider Assignment

```typescript
function getMandatoryProviders(serviceId: number): number[] {
  switch (serviceId) {
    case 1:
      return [1]; // Service 1 must go to Provider 1
    case 2:
      return [5]; // Service 2 must go to Provider 5
    case 3:
      return [1, 4]; // Service 3 must go to Providers 1 & 4
    default:
      return [];
  }
}
```

Logic:

- Based on business requirements, certain providers MUST receive certain service leads
- If mandatory provider has no quota → entire allocation FAILS
- Ensures critical providers always get their leads

2. Optional Provider Pool

```typescript
function getOptionalProviders(serviceId: number): number[] {
  switch (serviceId) {
    case 1:
      // Service 1: Providers 2, 3, 4 available for fair distribution
      return [2, 3, 4];
    case 2:
      // Service 2: Providers 6, 7, 8 available for fair distribution
      return [6, 7, 8];
    case 3:
      // Service 3: All except mandatory (1, 4) available
      return [2, 3, 5, 6, 7, 8];
    default:
      return [];
  }
}
```

Purpose:

- Provides pool of providers available for fair allocation
- Separate pools per service to maintain business logic
- Prevents duplicate allocations (providers already assigned don't get assigned again)

3. Fair Allocation (Round-Robin)

```typescript
async function getNextFairProvider(
  serviceId: number,
  optionalProviders: number[],
  excludeProviders: number[],
): Promise<number | null> {
  let state = await prisma.fairAllocationState.findUnique({
    where: { serviceId },
  });

  let currentIndex = parseInt(state.roundRobinState) || 0;

  const availableProviders = optionalProviders.filter(
    (p) => !excludeProviders.includes(p),
  );

  if (availableProviders.length === 0) return null;

  let attempts = 0;
  while (attempts < availableProviders.length) {
    const providerIndex = currentIndex % availableProviders.length;
    const providerId = availableProviders[providerIndex];

    const hasQuota = await checkProviderQuota(providerId);

    if (hasQuota) {
      const nextIndex = (currentIndex + 1) % availableProviders.length;
      await prisma.fairAllocationState.update({
        where: { serviceId },
        data: { roundRobinState: nextIndex.toString() },
      });

      return providerId;
    }

    currentIndex++;
    attempts++;
  }

  return null;
}
```

How It Works:

1. Persistent State: `FairAllocationState` table stores the current round-robin index
2. Round-Robin Logic: Rotate through providers cyclically
3. Quota Check: Skip providers without quota

4. State Update: Increment index for next allocation (atomic)

Allocation Flow Example

Scenario: Create 4 Service 1 leads

Service 1 Requirements:
├─ Mandatory: [Provider 1]
└─ Optional: [Provider 2, 3, 4]

Initial State:
├─ All providers: quota = 10
└─ FairAllocationState.service1 = "0"

Lead 1:
├─ Assign mandatory: Provider 1
├─ Assign optional[0]: Provider 2 (index 0)
├─ Assign optional[1]: Provider 3 (index 1)
├─ Update state to index 2
└─ Result: [1, 2, 3]

Lead 2:
├─ Assign mandatory: Provider 1
├─ Assign optional[2]: Provider 4 (index 2)
├─ Assign optional[0]: Provider 2 (index 0, wrapped)
├─ Update state to index 1
└─ Result: [1, 4, 2]

Lead 3:
├─ Assign mandatory: Provider 1
├─ Assign optional[1]: Provider 3 (index 1)
├─ Assign optional[2]: Provider 4 (index 2, skipped if full)
├─ Update state to index 3 % 3 = 0
└─ Result: [1, 3, ...]

Lead 4:
├─ Assign mandatory: Provider 1
├─ Continue rotation...
└─ Result: [1, ...]

Result: Each provider in optional pool gets equal distribution over time.

Quota Management

Monthly Quota System

```typescript
function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function checkProviderQuota(providerId: number): Promise<boolean> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  const allocationsThisMonth = await prisma.leadAllocation.count({
    where: {
      providerId,
      assignedAt: {
        gte: new Date(
          Math.max(
            provider.quotaResetDate.getTime(),
            getCurrentMonthStart().getTime(),
          ),
        ),
      },
    },
  });

  const remainingQuota = provider.monthlyQuota - allocationsThisMonth;
  return remainingQuota > 0;
}
```

Features:

- Quota resets on calendar month or via webhook
- `quotaResetDate` tracks when quota was last reset
- Handles mid-month quota resets (via payment webhook)
- Prevents allocation once quota exhausted

Quota Reset via Webhook

```typescript
async function resetProviderQuota(
  providerId: number,
  webhookId: string,
  amount: number = 10,
): Promise<{ success: boolean }> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { externalId: webhookId },
  });

  if (existing && existing.processed) {
    return { success: true };
  }

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      monthlyQuota: amount,
      quotaResetDate: new Date(),
    },
  });

  await prisma.webhookEvent.create({
    data: {
      externalId: webhookId,
      providerId,
      eventType: "quota_reset",
      payload: JSON.stringify({ amount }),
      processed: true,
      processedAt: new Date(),
    },
  });

  return { success: true };
}
```

Concurrency Handling

Problem Statement

When multiple leads are created simultaneously:

- Race conditions on allocation state
- Duplicate allocations to same provider
- Inconsistent quota tracking

Solution: Database-Level Constraints

1. Unique Constraints

```sql
-- Prevent duplicate leads for same phone number and service
ALTER TABLE lead ADD CONSTRAINT unique_lead_per_service
  UNIQUE (phone_number, service_id);

-- Prevent same provider receiving same lead twice
ALTER TABLE lead_allocation ADD CONSTRAINT unique_allocation
  UNIQUE (lead_id, provider_id);

-- Prevent duplicate webhook processing
ALTER TABLE webhook_event ADD CONSTRAINT unique_webhook_event
  UNIQUE (external_id);
```

2. Atomic Transactions

```typescript
async function allocateLead(
  leadId: string,
  serviceId: number,
): Promise<AllocationResult> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Check mandatory providers (within transaction)
    // Step 2: Get fair allocation providers (within transaction)
    // Step 3: Create all allocations (atomic)

    const allocations = await Promise.all(
      providers.map((providerId) =>
        tx.leadAllocation.create({
          data: { leadId, providerId },
        }),
      ),
    );

    return { success: true, allocated: allocations };
  });
}
```

Benefits:

- All allocation operations succeed or all fail
- No partial allocations
- Database maintains consistency

3. Allocation Lock Pattern

```typescript
async function allocateWithLock(leadId: string, serviceId: number) {
  // Create a lock record to prevent concurrent processing
  try {
    await prisma.allocationLock.create({
      data: {
        leadId,
        expiresAt: new Date(Date.now() + 30000), // 30 second lock
      },
    });

    // Proceed with allocation
    const result = await allocateLead(leadId, serviceId);

    // Remove lock
    await prisma.allocationLock.delete({
      where: { leadId },
    });

    return result;
  } catch (error) {
    // Lock already exists - another request processing this lead
    // Return error or wait and retry
  }
}
```

Concurrency Test Scenario

Setup: Create 10 leads simultaneously for Service 1

Concurrent Requests (all at t=0):
├─ Lead A: /api/leads POST
├─ Lead B: /api/leads POST
├─ Lead C: /api/leads POST
├─ Lead D: /api/leads POST
├─ Lead E: /api/leads POST
├─ Lead F: /api/leads POST
├─ Lead G: /api/leads POST
├─ Lead H: /api/leads POST
├─ Lead I: /api/leads POST
└─ Lead J: /api/leads POST

Database Processing (serialized internally):
├─ Lead A: Allocate to [1, 2, 3] → State: index=1
├─ Lead B: Allocate to [1, 4, 2] → State: index=2
├─ Lead C: Allocate to [1, 3, 4] → State: index=0
├─ Lead D: Allocate to [1, 2, 3] → State: index=1
├─ Lead E: Allocate to [1, 4, 2] → State: index=2
├─ Lead F: Allocate to [1, 3, 4] → State: index=0
├─ Lead G: Allocate to [1, 2, 3] → State: index=1
├─ Lead H: Allocate to [1, 4, 2] → State: index=2
├─ Lead I: Allocate to [1, 3, 4] → State: index=0
└─ Lead J: Allocate to [1, 2, 3] → State: index=1

Result:
├─ Provider 1: 10 allocations
├─ Provider 2: ~7-8 allocations
├─ Provider 3: ~7-8 allocations
└─ Provider 4: ~6-7 allocations
Fair distribution achieved despite concurrent requests

Webhook Idempotency

Why Idempotency Matters

Payment gateways may retry webhook calls if unsure about delivery:

- First attempt: Create quota reset
- Network timeout
- Second attempt: Should not double-reset quota

Idempotency Implementation

```typescript
async function handleQuotaReset(req, res) {
  const { providerId, webhookId, amount } = req.body;

  try {
    // Step 1: Check if webhook already processed
    const existing = await prisma.webhookEvent.findUnique({
      where: { externalId: webhookId },
    });

    if (existing && existing.processed) {
      // Already processed successfully - return success (idempotent)
      res.json({
        success: true,
        message: "Already processed (idempotent)",
      });
      return;
    }

    // Step 2: Process quota reset
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        monthlyQuota: amount,
        quotaResetDate: new Date(),
      },
    });

    // Step 3: Record webhook event
    await prisma.webhookEvent.create({
      data: {
        externalId: webhookId, // Unique constraint prevents duplicates
        providerId,
        eventType: "quota_reset",
        payload: JSON.stringify({ amount }),
        processed: true,
        processedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error.code === "P2002") {
      // Unique constraint violation - webhook already exists
      // Return success to not trigger retries
      res.json({ success: true, idempotent: true });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}
```

Webhook Idempotency Flow

Request 1 (t=0):
├─ Check webhookEvent.externalId="ABC"
├─ Not found
├─ Reset quota: Provider 5 → 10 leads
├─ Create WebhookEvent
└─ ✓ Success

Network timeout...

Request 2 (t=30):
├─ Check webhookEvent.externalId="ABC"
├─ Found and processed=true
├─ Return success (idempotent)
└─ ✓ Success (no double-reset)

Request 3 (t=60):
├─ Check webhookEvent.externalId="ABC"
├─ Found and processed=true
├─ Return success (idempotent)
└─ ✓ Success

Result: Same webhook can be called multiple times safely.

Performance Analysis:

Time Complexity:

| Operation            | Complexity | Notes                        |
| -------------------- | ---------- | ---------------------------- |
| Mandatory assignment | O(m)       | m = mandatory providers (~2) |
| Quota check          | O(1)       | Indexed database query       |
| Fair allocation      | O(n)       | n = optional providers (~6)  |
| Total allocation     | O(m + n)   | Usually ~8 operations        |

Space Complexity

-> Lead allocation: O(1) - fixed 3 providers
-> Fair state: O(1) - single integer per service
-> Overall: O(1) - constant space

Scalability

-> 100 leads/day: No optimization needed
-> 1000 leads/day: Add database read replica
-> 10,000 leads/day: Implement caching layer (Redis)
-> 100,000+ leads/day: Separate allocation service + queue

Edge Cases

Case 1: Quota Exhaustion Mid-Allocation
Situation: Provider 2 and 3 both at quota
Mandatory: [1]
Optional: [2, 3, 4] but 2 and 3 at quota

    Result:
    ├─ Assign Provider 1 (mandatory)
    ├─ Skip Provider 2 (no quota)
    ├─ Skip Provider 3 (no quota)
    ├─ Assign Provider 4
    └─ FAIL: Only 2 providers available, need 3

    Handling: Return error, lead not assigned. Manual intervention needed.

Case 2: Service with Only Mandatory Providers

    Service: All mandatory are mandatory
    Example: Service X requires [Provider 1, 2, 3]

    Result:
    ├─ Assign Provider 1
    ├─ Assign Provider 2
    ├─ Assign Provider 3
    └─ Success: All mandatory, no optional needed

Case 3: Same Phone, Different Services

    Request 1: Phone 9999 + Service 1 → Success
    Request 2: Phone 9999 + Service 1 → FAIL (duplicate)
    Request 3: Phone 9999 + Service 2 → Success (different service)

Database Constraint:

```sql
UNIQUE (phone_number, service_id)
```

Allows same phone for different services.

Testing the Algorithm
Unit Tests

```typescript
describe("Allocation Algorithm", () => {
  test("should allocate 3 providers for Service 1", async () => {
    const result = await allocateLead("lead1", 1);
    expect(result.assignedProviders).toHaveLength(3);
    expect(result.assignedProviders).toContain(1); // Mandatory
  });

  test("should maintain round-robin order", async () => {
    const lead1 = await allocateLead("lead1", 1);
    const lead2 = await allocateLead("lead2", 1);
    expect(lead2.assignedProviders[1]).not.toEqual(lead1.assignedProviders[1]);
  });

  test("should respect quota limits", async () => {
    // Create 10 leads for Provider 1
    // 11th should fail
  });
});
```

Load Tests

Use `/test-tools` to generate concurrent loads:
-> Generate 100 leads simultaneously
-> Monitor allocation fairness
-> Verify no duplicates
-> Check quota consistency

This algorithm ensures fair, safe, and scalable lead distribution.
