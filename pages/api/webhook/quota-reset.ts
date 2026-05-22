import { NextApiRequest, NextApiResponse } from "next";
import { resetProviderQuota, getProviderStats } from "../../../lib/allocation";
import { broadcastQuotaUpdate } from "../../../lib/websocket";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return handleQuotaReset(req, res);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleQuotaReset(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { providerId, amount = 10, webhookId } = req.body;

    if (!providerId || !webhookId) {
      return res.status(400).json({
        error: "Missing required fields: providerId, webhookId",
      });
    }

    const numericProviderId = Number(providerId);
    const numericAmount = Number(amount);

    if (isNaN(numericProviderId)) {
      return res.status(400).json({ error: "providerId must be a valid number" });
    }

    const result = await resetProviderQuota(numericProviderId, webhookId, numericAmount);

    if (!result.success && result.duplicate) {
      console.log(`[Idempotency Active]: Handled duplicate webhook cleanly for ID: ${webhookId}`);
      return res.status(200).json({
        success: true,
        message: "This webhook event was already processed previously. (Idempotency Active)",
        providerId: numericProviderId,
        status: "ignored_duplicate"
      });
    }

    if (!result.success) {
      return res.status(400).json({
        error: result.error || "Failed to reset quota",
      });
    }

    const stats = await getProviderStats(numericProviderId);
    if (stats) {
      broadcastQuotaUpdate(numericProviderId, {
        monthlyQuota: stats.monthlyQuota,
        leadsReceived: stats.leadsReceived,
        remainingQuota: stats.remainingQuota,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quota reset successfully (idempotent)",
      providerId: numericProviderId,
      newQuota: numericAmount,
    });
  } catch (error: any) {
    if (error.code === "P2002" || error.message?.includes("Unique constraint failed")) {
      console.log(`[Idempotency Active]: Caught race condition for ID: ${req.body.webhookId}`);
      return res.status(200).json({
        success: true,
        message: "This webhook event was already processed previously. (Idempotency Active)",
        providerId: Number(req.body.providerId),
        status: "ignored_duplicate"
      });
    }

    console.error("Webhook unexpected error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}