import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className={styles.intro}>
          <h1>Hola, mi nombre es Ariel</h1>
          <p>
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://ariellamas.tech/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ariellamas.tech
            </a>{" "}
            or my ig's account{" "}
            <a
              href="https://instagram.com/wrong.404"
              target="_blank"
              rel="noopener noreferrer"
            >
              wrong.404
            </a>{" "}
            .
          </p>
        </div>
        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://ariellamas.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className={styles.logo}
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Official Site
          </a>
          <a
            className={styles.secondary}
            href="https://pythonanywhere.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Poligon Test Field
          </a>
        </div>
      </main>
    </div>
  );
}
