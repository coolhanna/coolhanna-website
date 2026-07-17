"use client";

import { useState } from "react";
import { PLATFORMS } from "@/lib/pipeline/stages";
import type { Platform } from "@/lib/pipeline/types";
import styles from "./pipeline.module.css";

interface AddVideoBarProps {
  onAdd: (title: string, platform: Platform) => void;
}

export function AddVideoBar({ onAdd }: AddVideoBarProps) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("reels");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, platform);
    setTitle("");
  }

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <input
        className={styles.input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="새 영상 아이디어 — 떠오르는 대로 적어두기"
        aria-label="새 영상 아이디어"
      />
      <select
        className={styles.select}
        value={platform}
        onChange={(e) => setPlatform(e.target.value as Platform)}
        aria-label="플랫폼"
      >
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
        추가
      </button>
    </form>
  );
}
