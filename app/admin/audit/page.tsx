import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminAuditPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Änderungsverlauf" description="Audit-Log für Inhalte, Rollenänderungen und kritische Nutzeraktionen." />
      <section className="admin-module-card">
        <p className="helper">Geplantes Format: actor, timestamp, entityType, entityId, action, summary (+ optional diff light).</p>
      </section>
    </div>
  );
}
