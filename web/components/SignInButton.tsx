"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5.04c1.85 0 3.5.64 4.8 1.9l3.58-3.58C18.2 1.35 15.3.25 12 .25 7.4.25 3.4 2.78 1.35 6.53l4.16 3.23C6.35 7.08 8.92 5.04 12 5.04z"
          opacity="0.9"
        />
        <path
          fill="currentColor"
          d="M23.49 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.45c-.28 1.5-1.12 2.77-2.4 3.62l3.76 2.92c2.2-2.03 3.68-5.02 3.68-8.73z"
          opacity="0.75"
        />
        <path
          fill="currentColor"
          d="M5.52 14.4a7.06 7.06 0 0 1 0-4.6L1.36 6.57A11.92 11.92 0 0 0 .24 12c0 1.94.42 3.78 1.16 5.42l4.12-3.02z"
          opacity="0.85"
        />
        <path
          fill="currentColor"
          d="M12 23.75c3.12 0 5.74-1.03 7.66-2.79l-3.76-2.92c-1.03.7-2.36 1.12-3.9 1.12-3.08 0-5.65-2.04-6.58-4.76l-4.16 3.23C3.4 21.22 7.4 23.75 12 23.75z"
          opacity="0.65"
        />
      </svg>
      Sign in with Google
    </button>
  );
}