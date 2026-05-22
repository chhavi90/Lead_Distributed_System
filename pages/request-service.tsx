import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../styles/form.module.css";

interface Service {
  id: number;
  name: string;
}

export default function RequestService() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    city: "",
    serviceId: "",
    description: "",
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get("/api/services");
        if (response.data.services) {
          setServices(response.data.services);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      }
    };

    fetchServices();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await axios.post("/api/leads", {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        city: formData.city,
        serviceId: parseInt(formData.serviceId),
        description: formData.description,
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          name: "",
          phoneNumber: "",
          city: "",
          serviceId: "",
          description: "",
        });

        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(
          "You have already submitted a request for this service with this phone number. Please use a different service or phone number."
        );
      } else {
        setError(
          err.response?.data?.error ||
            "Failed to submit request. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1>Request a Service</h1>
        <p className={styles.description}>
          Fill out the form below to request a service from our providers.
        </p>

        {success && (
          <div className={styles.successMessage}>
            ✅ Your request has been submitted successfully! Our providers will
            contact you soon.
          </div>
        )}

        {error && <div className={styles.errorMessage}>❌ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber">Phone Number *</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="9999999999"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="city">City *</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="New York"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="serviceId">Service Type *</label>
            <select
              id="serviceId"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Select a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Describe your service requirements..."
              rows={4}
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        <div className={styles.infoBox}>
          <h3>How it works</h3>
          <ol>
            <li>Fill out the form with your details</li>
            <li>Select the service you need</li>
            <li>We automatically assign you to 3 providers</li>
            <li>Providers will contact you shortly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
