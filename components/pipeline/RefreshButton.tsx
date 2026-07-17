"use client";

import styles from "./pipeline.module.css";

export function RefreshButton() {
  return (
    <button
      type="button"
      className={styles.refreshBtn}
      onClick={() => window.location.reload()}
      aria-label="새로고침"
      title="새로고침"
    >
      ⟳
    </button>
  );
}
