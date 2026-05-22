const { WebSocketServer } = require("ws");

let wss = null;
const clients = new Map();
let clientCounter = 0;

function initializeWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    const clientId = `client-${clientCounter++}`;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === "subscribe") {
          clients.set(clientId, { ws, providerId: data.providerId });
          ws.send(JSON.stringify({ type: "subscribed", providerId: data.providerId }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => { clients.delete(clientId); });
    ws.on("error", (error) => { console.error("WebSocket error:", error); });
  });

  return wss;
}

function broadcastLeadAllocation(providerId, lead) {
  if (!wss) return;
  clients.forEach((client) => {
    if (client.providerId === providerId) {
      try {
        client.ws.send(JSON.stringify({
          type: "new_lead",
          data: { ...lead, createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt }
        }));
      } catch (error) { console.error("Error sending WebSocket message:", error); }
    }
  });
}

function broadcastQuotaUpdate(providerId, quotaData) {
  if (!wss) return;
  clients.forEach((client) => {
    if (client.providerId === providerId) {
      try {
        client.ws.send(JSON.stringify({ type: "quota_update", data: quotaData }));
      } catch (error) { console.error("Error sending quota update:", error); }
    }
  });
}

function broadcastToAll(message) {
  if (!wss) return;
  clients.forEach((client) => {
    try { client.ws.send(JSON.stringify(message)); } 
    catch (error) { console.error("Error broadcasting to all:", error); }
  });
}

function getWebSocketServer() { return wss; }
function getConnectedClients() { return clients; }

module.exports = {
  initializeWebSocket,
  broadcastLeadAllocation,
  broadcastQuotaUpdate,
  broadcastToAll,
  getWebSocketServer,
  getConnectedClients
};