import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { allocateLead } from "../../lib/allocation";
import { broadcastLeadAllocation } from "../../lib/websocket";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return handleCreateLead(req, res);
  } else if (req.method === "GET") {
    return handleGetLeads(req, res);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleCreateLead(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { name, phoneNumber, city, serviceId, description } = req.body;

    if (!name || !phoneNumber || !city || !serviceId || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceId) },
    });

    if (!service) {
      return res.status(400).json({ error: "Invalid service" });
    }

    const existingLead = await prisma.lead.findUnique({
      where: {
        unique_lead_per_service: {
          phoneNumber,
          serviceId: parseInt(serviceId),
        },
      },
    });

    if (existingLead) {
      return res.status(409).json({
        error:
          "Lead already exists for this phone number and service combination",
        existingLeadId: existingLead.id,
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phoneNumber,
        city,
        serviceId: parseInt(serviceId),
        description,
      },
      include: {
        service: true,
      },
    });

    (async () => {
      try {
        const allocationResult = await allocateLead(lead.id, lead.serviceId);

        if (allocationResult.success) {
          allocationResult.assignedProviders.forEach((providerId) => {
            broadcastLeadAllocation(providerId, {
              id: lead.id,
              name: lead.name,
              phoneNumber: lead.phoneNumber,
              serviceId: lead.serviceId,
              city: lead.city,
              description: lead.description,
              createdAt: lead.createdAt,
            });
          });

          console.log(
            `Lead ${lead.id} allocated to providers:`,
            allocationResult.assignedProviders
          );
        } else {
          console.error(`Allocation failed for lead ${lead.id}:`, allocationResult.error);
        }
      } catch (error) {
        console.error("Allocation background error:", error);
      }
    })();

    res.status(201).json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
        city: lead.city,
        service: service.name,
        description: lead.description,
        createdAt: lead.createdAt,
      },
      message: "Lead created and allocated to providers",
    });
  } catch (error) {
    console.error("Lead creation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

async function handleGetLeads(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        service: true,
        allocations: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    res.status(200).json({
      success: true,
      leads: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
        city: lead.city,
        service: lead.service.name,
        description: lead.description,
        providers: lead.allocations.map((a) => a.provider.name),
        createdAt: lead.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
