import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return handleGetServices(req, res);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleGetServices(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const services = await prisma.service.findMany({
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json({
      success: true,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
      })),
    });
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
