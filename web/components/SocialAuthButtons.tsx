"use client";

import { signIn } from "next-auth/react";

function GithubIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.16c-3.22.7-3.9-1.55-3.9-1.55-.53-1.38-1.3-1.75-1.3-1.75-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.27-1.29-5.27-5.74 0-1.27.45-2.3 1.2-3.11-.12-.3-.52-1.47.11-3.07 0 0 .98-.31 3.17 1.19a10.9 10.9 0 0 1 5.77 0c2.2-1.5 3.18-1.19 3.18-1.19.63 1.6.23 2.77.11 3.07.75.81 1.2 1.84 1.2 3.11 0 4.46-2.7 5.44-5.28 5.73.42.36.79 1.08.79 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>;
}

export default function SocialAuthButtons({ action = "Continue" }: { action?: string }) {
  return (
    <div className="social-auth-stack">
      <button type="button" className="social-auth-button" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
        <span className="google-g">G</span><span>{action} with Google</span>
      </button>
      <button type="button" className="social-auth-button" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
        <GithubIcon /><span>{action} with GitHub</span>
      </button>
    </div>
  );
}
