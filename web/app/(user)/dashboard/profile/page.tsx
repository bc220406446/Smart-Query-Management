import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } });

  return <main className="container-page" style={{ maxWidth: 720 }}>
    <div className="page-header"><div className="page-header-left"><h1 className="page-title">My profile</h1><p className="page-subtitle">Keep your contact details current so WhatsApp queries reach your account.</p></div></div>
    {params.error && <div className="error-box" style={{ marginBottom: 18 }}>{params.error}</div>}
    {params.saved === "1" && <div className="success-box" style={{ marginBottom: 18 }}>Profile updated successfully.</div>}
    <form action={updateProfile} className="card" style={{ display: "grid", gap: 18 }}>
      <div className="field"><label htmlFor="profile-name" className="field-label">Full name</label><input id="profile-name" name="name" className="field-input" defaultValue={profile?.name ?? ""} required minLength={2} maxLength={100} /></div>
      <div className="field"><label htmlFor="profile-email" className="field-label">Email address</label><input id="profile-email" className="field-input" value={profile?.email ?? ""} readOnly /></div>
      <div className="field"><label htmlFor="profile-phone" className="field-label">WhatsApp phone number</label><input id="profile-phone" name="phone" className="field-input" type="tel" defaultValue={profile?.phone ?? ""} placeholder="923001234567" maxLength={15} /><span className="caption">Use country code without spaces or dashes. This number is used to match incoming WhatsApp queries.</span></div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="submit" className="btn btn-primary">Save profile</button></div>
    </form>
  </main>;
}
