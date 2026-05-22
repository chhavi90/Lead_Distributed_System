import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AllocationConfig {
  serviceId: number;
  mandatory: number[]; 
  optional: number[]; 
  totalSlots: number;
}

export function getMandatoryProviders(serviceId: number): number[] {
  switch (serviceId) {
    case 1:
      return [1];
    case 2:
      return [5];
    case 3:
      return [1, 4];
    default:
      return [];
  }
}


export function getOptionalProviders(serviceId: number): number[] {
  switch (serviceId) {
    case 1:
      return [2, 3, 4]; 
    case 2:
      return [6, 7, 8]; 
    case 3:
      return [2, 3, 5, 6, 7, 8]; 
    default:
      return [];
  }
}

function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function checkProviderQuota(
  providerId: number,
  leadCount: number = 1
): Promise<boolean> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) return false;

  const monthStart = getCurrentMonthStart();
  const allocationsThisMonth = await prisma.leadAllocation.count({
    where: {
      providerId,
      assignedAt: {
        gte: new Date(
          Math.max(provider.quotaResetDate.getTime(), monthStart.getTime())
        ),
      },
    },
  });

  const remainingQuota = provider.monthlyQuota - allocationsThisMonth;
  return remainingQuota >= leadCount;
}

async function getNextFairProvider(
  serviceId: number,
  optionalProviders: number[],
  excludeProviders: number[]
): Promise<number | null> {
  let state = await prisma.fairAllocationState.findUnique({
    where: { serviceId },
  });

  if (!state) {
    state = await prisma.fairAllocationState.create({
      data: {
        serviceId,
        roundRobinState: "0",
      },
    });
  }
  let currentIndex = parseInt(state.roundRobinState) || 0;

  const availableProviders = optionalProviders.filter(
    (p) => !excludeProviders.includes(p)
  );

  if (availableProviders.length === 0) {
    return null;
  }

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

export async function allocateLead(
  leadId: string,
  serviceId: number
): Promise<{
  success: boolean;
  assignedProviders: number[];
  error?: string;
}> {
  try {
    const mandatory = getMandatoryProviders(serviceId);
    const optional = getOptionalProviders(serviceId);
    const totalSlots = 3;

    const assignedProviders: number[] = [];
    const failedMandatory: number[] = [];

    for (const providerId of mandatory) {
      const hasQuota = await checkProviderQuota(providerId);

      if (hasQuota) {
        assignedProviders.push(providerId);
      } else {
        failedMandatory.push(providerId);
      }
    }

    if (failedMandatory.length > 0) {
      return {
        success: false,
        assignedProviders: [],
        error: `Failed to assign mandatory providers: ${failedMandatory.join(
          ", "
        )}`,
      };
    }

    const remainingSlots = totalSlots - assignedProviders.length;

    for (let i = 0; i < remainingSlots; i++) {
      const nextProvider = await getNextFairProvider(
        serviceId,
        optional,
        assignedProviders
      );

      if (nextProvider) {
        assignedProviders.push(nextProvider);
      } else {
        return {
          success: false,
          assignedProviders: [],
          error: `Could not find enough providers with quota for fair allocation`,
        };
      }
    }

    const existingCount = await prisma.leadAllocation.count({
      where: { leadId },
    });

    if (existingCount > 0) {
      return {
        success: false,
        assignedProviders: [],
        error: "Lead already allocated",
      };
    }

    await Promise.all(
      assignedProviders.map((providerId) =>
        prisma.leadAllocation.create({
          data: {
            leadId,
            providerId,
          },
        })
      )
    );

    return {
      success: true,
      assignedProviders,
    };
  } catch (error) {
    console.error("Allocation error:", error);
    return {
      success: false,
      assignedProviders: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function resetProviderQuota(
  providerId: number,
  webhookId: string,
  amount: number = 10
): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { externalId: webhookId },
    });

    if (existingEvent) {
      return { success: false, duplicate: true, error: "Duplicate webhook event detected." };
    }

    let event;
    try {
      event = await prisma.webhookEvent.create({
        data: {
          externalId: webhookId,
          providerId,
          eventType: "quota_reset",
          payload: JSON.stringify({ amount }),
        },
      });
    } catch (createError: any) {
      if (createError.code === "P2002") {
        return { success: false, duplicate: true, error: "Duplicate webhook event detected." };
      }
      throw createError;
    }

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        monthlyQuota: amount,
        quotaResetDate: new Date(),
      },
    });

    await prisma.quotaReset.create({
      data: {
        providerId,
        webhookId,
        amount,
      },
    });

    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, duplicate: true, error: "Duplicate webhook event detected." };
    }

    console.error("Quota reset error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getProviderStats(providerId: number) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    return null;
  }

  const monthStart = getCurrentMonthStart();
  const allocationsThisMonth = await prisma.leadAllocation.count({
    where: {
      providerId,
      assignedAt: {
        gte: new Date(
          Math.max(provider.quotaResetDate.getTime(), monthStart.getTime())
        ),
      },
    },
  });

  const remainingQuota = provider.monthlyQuota - allocationsThisMonth;

  return {
    id: provider.id,
    name: provider.name,
    monthlyQuota: provider.monthlyQuota,
    leadsReceived: allocationsThisMonth,
    remainingQuota: Math.max(0, remainingQuota),
    quotaResetDate: provider.quotaResetDate,
  };
}