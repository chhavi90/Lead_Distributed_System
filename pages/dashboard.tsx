import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import styles from "../styles/dashboard.module.css";

interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  city: string;
  service: string;
  description: string;
  assignedAt: string;
  createdAt: string;
}

interface ProviderData {
  id: number;
  name: string;
  monthlyQuota: number;
  leadsReceived: number;
  remainingQuota: number;
  quotaResetDate: string;
}

const PROVIDERS = [
  { id: 1, name: "Provider 1" },
  { id: 2, name: "Provider 2" },
  { id: 3, name: "Provider 3" },
  { id: 4, name: "Provider 4" },
  { id: 5, name: "Provider 5" },
  { id: 6, name: "Provider 6" },
  { id: 7, name: "Provider 7" },
  { id: 8, name: "Provider 8" },
];

export default function Dashboard() {
  const [selectedProviderId, setSelectedProviderId] = useState(1);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  const fetchProviderData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/provider/${selectedProviderId}`);
      if (response.data.success) {
        setProviderData(response.data.provider);
        setLeads(response.data.leads);
      }
    } catch (error) {
      console.error("Failed to fetch provider data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId]);

  useEffect(() => {
    setLoading(true);
    fetchProviderData();

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/api/ws`;

    try {
      setConnectionStatus("connecting");
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus("connected");
        ws.send(
          JSON.stringify({
            type: "subscribe",
            providerId: selectedProviderId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "new_lead") {
            setLeads((prev) => [message.data, ...prev]);
            setProviderData((prev) =>
              prev
                ? {
                    ...prev,
                    leadsReceived: prev.leadsReceived + 1,
                    remainingQuota: prev.remainingQuota - 1,
                  }
                : null
            );
          } else if (message.type === "quota_update") {
            setProviderData((prev) =>
              prev ? { ...prev, ...message.data } : null
            );
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("disconnected");
      };

      wsRef.current = ws;

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setConnectionStatus("disconnected");
    }
  }, [selectedProviderId, fetchProviderData]);

  const handleProviderChange = (providerId: number) => {
    setSelectedProviderId(providerId);
    setLoading(true);
    setLeads([]);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "#10b981"; 
      case "connecting":
        return "#f59e0b"; 
      case "disconnected":
        return "#ef4444"; 
    }
  };

  const getUtilizationColor = () => {
    if (!providerData) return "#999";
    const rate = (providerData.leadsReceived / providerData.monthlyQuota) * 100;
    if (rate >= 80) return "#ef4444"; 
    if (rate >= 50) return "#f59e0b";
    return "#10b981"; 
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Provider Dashboard</h1>
        <div className={styles.connectionIndicator}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getConnectionStatusColor() }}
          />
          <span>
            {connectionStatus === "connected"
              ? "Real-time Connected"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
          </span>
        </div>
      </div>

      <div className={styles.providersGrid}>
        <h2>Select Provider</h2>
        <div className={styles.providerButtons}>
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className={`${styles.providerBtn} ${
                selectedProviderId === provider.id ? styles.active : ""
              }`}
              onClick={() => handleProviderChange(provider.id)}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className={styles.loading}>Loading...</div>}

      {!loading && providerData && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Monthly Quota</h3>
              <div className={styles.statValue}>{providerData.monthlyQuota}</div>
              <p className={styles.statLabel}>Total leads allowed</p>
            </div>

            <div className={styles.statCard}>
              <h3>Leads Received</h3>
              <div className={styles.statValue}>{providerData.leadsReceived}</div>
              <p className={styles.statLabel}>This month</p>
            </div>

            <div className={styles.statCard}>
              <h3>Remaining Quota</h3>
              <div
                className={styles.statValue}
                style={{ color: getUtilizationColor() }}
              >
                {providerData.remainingQuota}
              </div>
              <p className={styles.statLabel}>Available leads</p>
            </div>

            <div className={styles.statCard}>
              <h3>Utilization</h3>
              <div
                className={styles.statValue}
                style={{ color: getUtilizationColor() }}
              >
                {((providerData.leadsReceived / providerData.monthlyQuota) * 100).toFixed(
                  0
                )}
                %
              </div>
              <p className={styles.statLabel}>of monthly quota</p>
            </div>
          </div>

          <div className={styles.leadsSection}>
            <h2>Assigned Leads ({leads.length})</h2>

            {leads.length === 0 ? (
              <div className={styles.noLeads}>
                <p>No leads assigned yet</p>
                <small>
                  New leads will appear here in real-time
                </small>
              </div>
            ) : (
              <div className={styles.leadsList}>
                {leads.map((lead) => (
                  <div key={lead.id} className={styles.leadCard}>
                    <div className={styles.leadHeader}>
                      <h4>{lead.name}</h4>
                      <span className={styles.service}>{lead.service}</span>
                    </div>
                    <div className={styles.leadDetails}>
                      <p>
                        <strong>Phone:</strong> {lead.phoneNumber}
                      </p>
                      <p>
                        <strong>City:</strong> {lead.city}
                      </p>
                      <p>
                        <strong>Description:</strong> {lead.description}
                      </p>
                      <p className={styles.timestamp}>
                        <strong>Assigned:</strong>{" "}
                        {new Date(lead.assignedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        ${styles}
      `}</style>
    </div>
  );
}
