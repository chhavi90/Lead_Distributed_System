import Link from "next/link";
import styles from "../styles/home.module.css";

export default function Home() {
  const features = [
    {
      icon: "📝",
      title: "Customer Service Requests",
      description: "Submit service requests with automatic duplicate prevention",
      link: "/request-service",
      button: "Request Service",
    },
    {
      icon: "🎯",
      title: "Smart Lead Allocation",
      description:
        "Automatic fair distribution to 3 providers using round-robin algorithm",
      link: "#",
      button: "Learn More",
    },
    {
      icon: "📊",
      title: "Provider Dashboard",
      description: "Real-time lead updates with WebSocket technology",
      link: "/dashboard",
      button: "View Dashboard",
    },
    {
      icon: "⚙️",
      title: "Test & Debug",
      description: "Test webhooks, idempotency, and concurrent operations",
      link: "/test-tools",
      button: "Test Tools",
    },
  ];

  const benefits = [
    {
      title: "Mandatory Assignment",
      description: "Ensure critical providers always receive specific leads",
    },
    {
      title: "Fair Distribution",
      description: "Round-robin allocation ensures equal opportunity for all providers",
    },
    {
      title: "Real-Time Updates",
      description: "WebSocket-powered instant notifications for new leads",
    },
    {
      title: "Quota Management",
      description: "Monthly limits prevent overload and ensure fairness",
    },
    {
      title: "Webhook Idempotency",
      description: "Safe retry mechanism for payment webhooks and quota resets",
    },
    {
      title: "Concurrent Safety",
      description: "Handles simultaneous lead creation without conflicts",
    },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Prowider Lead Distribution System</h1>
          <p>
            Enterprise-grade lead management with intelligent allocation,
            real-time updates, and webhook safety
          </p>
          <div className={styles.heroCTA}>
            <Link href="/request-service" className={styles.ctaPrimary}>
              Start Now
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <h2>Core Features</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link href={feature.link} className={styles.featureButton}>
                {feature.button} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.benefitsSection}>
        <h2>Why Choose This System</h2>
        <div className={styles.benefitsGrid}>
          {benefits.map((benefit, index) => (
            <div key={index} className={styles.benefitCard}>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.techSection}>
        <h2>Technology Stack</h2>
        <div className={styles.techGrid}>
          <div className={styles.techCard}>
            <strong>Frontend</strong>
            <p>Next.js 14 + React 18</p>
          </div>
          <div className={styles.techCard}>
            <strong>Database</strong>
            <p>PostgreSQL + Prisma ORM</p>
          </div>
          <div className={styles.techCard}>
            <strong>Real-Time</strong>
            <p>WebSocket Communication</p>
          </div>
          <div className={styles.techCard}>
            <strong>Deployment</strong>
            <p>Production Ready</p>
          </div>
        </div>
      </section>

      <section className={styles.quickStart}>
        <h2>Quick Start</h2>
        <div className={styles.quickSteps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Set Up Database</h3>
            <p>Run migrations to set up PostgreSQL schema</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Seed Data</h3>
            <p>Populate 8 providers and 3 services</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Start Server</h3>
            <p>Run dev server with npm run dev</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h3>Create Leads</h3>
            <p>Submit requests and watch allocation happen</p>
          </div>
        </div>
        <Link href="/request-service" className={styles.ctaPrimary}>
          Get Started
        </Link>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>8</div>
          <div className={styles.statLabel}>Providers</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>3</div>
          <div className={styles.statLabel}>Services</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>10</div>
          <div className={styles.statLabel}>Lead Quota</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>∞</div>
          <div className={styles.statLabel}>Scalability</div>
        </div>
      </section>
    </div>
  );
}
