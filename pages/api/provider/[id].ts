import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getProviderStats } from "../../../lib/allocation";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid provider ID" });
  }

  const providerId = parseInt(id);

  if (req.method === "GET") {
    return handleGetProvider(providerId, res);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleGetProvider(providerId: number, res: NextApiResponse) {
  try {
    const stats = await getProviderStats(providerId);

    if (!stats) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const allocations = await prisma.leadAllocation.findMany({
      where: { providerId },
      include: {
        lead: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
      take: 100,
    });

    const leads = allocations.map((a) => ({
      id: a.lead.id,
      name: a.lead.name,
      phoneNumber: a.lead.phoneNumber,
      city: a.lead.city,
      service: a.lead.service.name,
      description: a.lead.description,
      assignedAt: a.assignedAt,
      createdAt: a.lead.createdAt,
    }));

    res.status(200).json({
      success: true,
      provider: {
        id: stats.id,
        name: stats.name,
        monthlyQuota: stats.monthlyQuota,
        leadsReceived: stats.leadsReceived,
        remainingQuota: stats.remainingQuota,
        quotaResetDate: stats.quotaResetDate,
      },
      leads,
      stats: {
        totalLeads: leads.length,
        utilizationRate: (
          (stats.leadsReceived / stats.monthlyQuota) *
          100
        ).toFixed(1),
      },
    });
  } catch (error) {
    console.error("Get provider error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
