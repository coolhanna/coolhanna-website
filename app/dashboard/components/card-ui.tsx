"use client";

// 광고/공구 카드 매니저 공용 작은 UI 프리미티브.

export function cleanFields(o: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v != null && v.toString().trim() !== "") out[k] = v.toString().trim();
  }
  return out;
}

export function AudienceBadge({ audience }: { audience: string }) {
  const isHanna = audience === "한나";
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
      style={{
        color: isHanna ? "var(--accent-text)" : "var(--secondary-text)",
        backgroundColor: isHanna ? "var(--accent-soft)" : "var(--secondary-soft)",
      }}
    >
      {audience}
    </span>
  );
}

export function StateSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded-md font-medium cursor-pointer"
      style={{
        border: "1px solid var(--border-strong)",
        backgroundColor: "var(--bg-card-soft)",
        color: "var(--text-main)",
      }}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className="font-medium" style={accent ? { color: "var(--accent)" } : undefined}>
        {value}
      </p>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <div className="flex gap-2">
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                backgroundColor: active ? "var(--accent)" : "var(--bg-card-soft)",
                color: active ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-page)" }}
      />
    </div>
  );
}
