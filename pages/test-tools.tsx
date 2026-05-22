import { useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import styles from "../styles/test-tools.module.css";

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

const SERVICES = [
  { id: 1, name: "Service 1" },
  { id: 2, name: "Service 2" },
  { id: 3, name: "Service 3" },
];

interface TestResult {
  type: "success" | "error" | "info";
  message: string;
  timestamp: Date;
  details?: any;
}

export default function TestTools() {
  const [selectedProviderId, setSelectedProviderId] = useState(1);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (
    type: "success" | "error" | "info",
    message: string,
    details?: any
  ) => {
    setResults((prev) => [
      {
        type,
        message,
        timestamp: new Date(),
        details,
      },
      ...prev,
    ]);
  };

  const handleResetQuota = async () => {
    setLoading(true);
    try {
      const webhookId = uuidv4();
      const response = await axios.post("/api/webhook/quota-reset", {
        providerId: selectedProviderId,
        amount: 10,
        webhookId,
      });

      addResult(
        "success",
        `Quota reset for Provider ${selectedProviderId} to 10 leads`,
        response.data
      );
    } catch (error: any) {
      addResult(
        "error",
        `Failed to reset quota: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestIdempotency = async () => {
    setLoading(true);
    try {
      const webhookId = uuidv4();
      
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          axios.post("/api/webhook/quota-reset", {
            providerId: selectedProviderId,
            amount: 10,
            webhookId, 
          })
        );
      }

      const results = await Promise.all(promises);
      addResult(
        "success",
        "Webhook called 3 times with same ID (idempotency test)",
        {
          webhookId,
          calls: 3,
          allSucceeded: results.every((r) => r.data.success),
        }
      );
    } catch (error: any) {
      addResult(
        "error",
        `Idempotency test failed: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeads = async () => {
    setLoading(true);
    try {
      const leads = [];
      const basePhone = Math.floor(Math.random() * 9000000000) + 1000000000;

      for (let i = 0; i < 10; i++) {
        const service = SERVICES[i % SERVICES.length];
        const phoneNumber = (basePhone + i).toString();

        leads.push({
          name: `Test Lead ${i + 1}`,
          phoneNumber,
          city: `Test City ${i + 1}`,
          serviceId: service.id,
          description: `Concurrent test lead #${i + 1} for ${service.name}`,
        });
      }

      const promises = leads.map((lead) =>
        axios.post("/api/leads", lead)
      );

      const results = await Promise.all(promises);

      const successful = results.filter((r) => r.data.success).length;
      const failed = results.length - successful;

      addResult(
        "success",
        `Generated ${successful} concurrent leads (${failed} failed)`,
        {
          total: results.length,
          successful,
          failed,
          leads: results.map((r) => ({
            id: r.data.lead?.id,
            name: r.data.lead?.name,
          })),
        }
      );
    } catch (error: any) {
      addResult(
        "error",
        `Lead generation failed: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case "success":
        return "#10b981";
      case "error":
        return "#ef4444";
      case "info":
        return "#3b82f6";
      default:
        return "#999";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ Test Tools</h1>
        <p>Test webhooks, idempotency, and concurrent operations</p>
      </div>

      <div className={styles.controlPanel}>
        <div className={styles.section}>
          <h2>Provider Selection</h2>
          <div className={styles.providerSelect}>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(parseInt(e.target.value))}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Quota Management</h2>
          <button
            onClick={handleResetQuota}
            disabled={loading}
            className={styles.primaryBtn}
          >
            🔄 Reset Quota to 10
          </button>
          <p className={styles.description}>
            Simulates a webhook call to reset the provider's monthly quota
          </p>
        </div>

        <div className={styles.section}>
          <h2>Idempotency Testing</h2>
          <button
            onClick={handleTestIdempotency}
            disabled={loading}
            className={styles.primaryBtn}
          >
            🔁 Call Webhook 3x (Same ID)
          </button>
          <p className={styles.description}>
            Calls the webhook 3 times with the same ID to verify idempotency
          </p>
        </div>

        <div className={styles.section}>
          <h2>Concurrency Testing</h2>
          <button
            onClick={handleGenerateLeads}
            disabled={loading}
            className={styles.primaryBtn}
          >
            ⚡ Generate 10 Leads Simultaneously
          </button>
          <p className={styles.description}>
            Creates 10 leads at once to test concurrent allocation
          </p>
        </div>

        <div className={styles.section}>
          <button
            onClick={handleClearResults}
            className={styles.secondaryBtn}
          >
            Clear Results
          </button>
        </div>
      </div>

      <div className={styles.resultsPanel}>
        <h2>Test Results ({results.length})</h2>

        {results.length === 0 ? (
          <div className={styles.noResults}>
            <p>No tests run yet</p>
            <small>Results will appear here</small>
          </div>
        ) : (
          <div className={styles.resultsList}>
            {results.map((result, index) => (
              <div
                key={index}
                className={styles.resultItem}
                style={{
                  borderLeftColor: getResultColor(result.type),
                }}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.resultType}>{result.type}</span>
                  <span className={styles.resultTime}>
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className={styles.resultMessage}>{result.message}</p>
                {result.details && (
                  <details className={styles.resultDetails}>
                    <summary>View Details</summary>
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        ${styles}
      `}</style>
    </div>
  );
}
