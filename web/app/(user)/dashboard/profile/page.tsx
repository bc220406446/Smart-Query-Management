import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true, role: true, isOnLeave: true, leaveStart: true, leaveEnd: true, leaveAutoReply: true, emailNotifications: true, whatsappNotifications: true } });

  return <main className="container-page" style={{ maxWidth: 720 }}>
    <div className="page-header"><div className="page-header-left"><h1 className="page-title">My profile</h1><p className="page-subtitle">Keep your contact details current so WhatsApp queries reach your account.</p></div></div>
    {params.error && <div className="error-box" style={{ marginBottom: 18 }}>{params.error}</div>}
    {params.saved === "1" && <div className="success-box" style={{ marginBottom: 18 }}>Profile updated successfully.</div>}
    <form action={updateProfile} className="card" style={{ display: "grid", gap: 18 }}>
      <div className="field"><label htmlFor="profile-name" className="field-label">Full name</label><input id="profile-name" name="name" className="field-input" defaultValue={profile?.name ?? ""} required minLength={2} maxLength={100} /></div>
      <div className="field"><label htmlFor="profile-email" className="field-label">Email address</label><input id="profile-email" className="field-input" value={profile?.email ?? ""} readOnly /></div>
      <div className="field"><label htmlFor="profile-phone" className="field-label">WhatsApp phone number</label><input id="profile-phone" name="phone" className="field-input" type="tel" defaultValue={profile?.phone ?? ""} placeholder="923001234567" maxLength={15} /><span className="caption">Use country code without spaces or dashes. This number is used to match incoming WhatsApp queries.</span></div>
      <div className="field"><span className="field-label">Notification preferences</span><label style={{ display: "flex", alignItems: "center", gap: 10 }}><input name="emailNotifications" type="checkbox" defaultChecked={profile?.emailNotifications ?? false} /> Email notifications</label><label style={{ display: "flex", alignItems: "center", gap: 10 }}><input name="whatsappNotifications" type="checkbox" defaultChecked={profile?.whatsappNotifications ?? false} /> WhatsApp notifications</label><span className="caption">Both notification channels are initially disabled. Enable only the channels you want to use.</span></div>
      {profile?.role === "INSTRUCTOR" && <>
        <div className="field"><label className="field-label" htmlFor="profile-leave">Leave mode</label><label style={{ display: "flex", alignItems: "center", gap: 10 }}><input id="profile-leave" name="isOnLeave" type="checkbox" defaultChecked={profile.isOnLeave} /> <span>Enable leave auto-reply</span></label><span className="caption">New AI-assigned queries remain assigned to you, move to In Progress, and receive your auto-reply. Leave cannot be enabled while you have unresolved assigned queries.</span></div>
        <div className="form-grid-2"><div className="field"><label htmlFor="leave-start" className="field-label">Leave start</label><input id="leave-start" name="leaveStart" className="field-input" type="date" defaultValue={profile.leaveStart ? new Date(profile.leaveStart).toISOString().slice(0, 10) : ""} /></div><div className="field"><label htmlFor="leave-end" className="field-label">Leave end</label><input id="leave-end" name="leaveEnd" className="field-input" type="date" defaultValue={profile.leaveEnd ? new Date(profile.leaveEnd).toISOString().slice(0, 10) : ""} /></div></div>
        <div className="field"><label htmlFor="leave-reply" className="field-label">Leave auto-reply</label><textarea id="leave-reply" name="leaveAutoReply" className="field-textarea" rows={4} defaultValue={profile.leaveAutoReply ?? ""} placeholder="I am currently unavailable. Your query has been routed to the department support team." /><span className="caption">Used when a new query is routed away from you while leave mode is active.</span></div>
      </>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="submit" className="btn btn-primary">Save profile</button></div>
    </form>
  </main>;
}
