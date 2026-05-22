import type { AppProps } from "next/app";
import Link from "next/link";
import styles from "../styles/app.module.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            🚀 Prowider Lead System
          </Link>
          <div className={styles.navLinks}>
            <Link href="/request-service" className={styles.navLink}>
              📝 Request Service
            </Link>
            <Link href="/dashboard" className={styles.navLink}>
              📊 Dashboard
            </Link>
            <Link href="/test-tools" className={styles.navLink}>
              ⚙️ Test Tools
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <Component {...pageProps} />
      </main>

      <footer className={styles.footer}>
        <p>
          Prowider Lead Distribution System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}