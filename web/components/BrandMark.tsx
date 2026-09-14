export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <rect x="2" y="2" width="36" height="36" rx="11" fill="currentColor" />
        <path d="M11 27V13h3.2l5.8 8.1 5.8-8.1H29v14h-3.2v-8.7L20 25.7l-5.8-7.4V27H11Z" fill="var(--brand-contrast)" />
      </svg>
    </span>
  );
}
