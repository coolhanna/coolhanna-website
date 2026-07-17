import styles from "./pipeline.module.css";

const ITEMS = [
  { label: "완료", className: styles.dotDone },
  { label: "대기", className: styles.dotTodo },
];

export function Legend() {
  return (
    <div className={styles.legend}>
      {ITEMS.map((item) => (
        <span key={item.label} className={styles.legendItem}>
          <span className={`${styles.dot} ${item.className}`} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
