export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" role="img" aria-label="Smart Query Hub">
        <rect x="2" y="2" width="36" height="36" rx="11" fill="currentColor" />
        <path d="M10 12.5c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v11.2c0 1.1-.9 2-2 2H19l-6.5 4.8v-4.8H12c-1.1 0-2-.9-2-2V12.5Z" fill="var(--brand-contrast)" opacity=".96" />
        <path d="m14.5 20.5 3.4-4.2 3.1 3 4.5-5.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14.5" cy="20.5" r="1.4" fill="currentColor" /><circle cx="25.5" cy="14.1" r="1.4" fill="currentColor" />
      </svg>
    </span>
  );
}
