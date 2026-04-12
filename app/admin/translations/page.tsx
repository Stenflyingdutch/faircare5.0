import { AdminModulePlaceholder } from '@/components/admin/common/AdminModulePlaceholder';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminTranslationsPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Sprachen" description="Überblick über fehlende und veraltete Übersetzungen in allen Modulen." />
      <AdminModulePlaceholder filters={<><select className="input"><option>Sprache</option></select><select className="input"><option>Modultyp</option></select></>}>
        <p className="helper">Deep-Links zu Datensätzen werden hier zentral gebündelt.</p>
      </AdminModulePlaceholder>
    </div>
  );
}
