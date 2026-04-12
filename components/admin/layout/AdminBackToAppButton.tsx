import Link from 'next/link';

interface AdminBackToAppButtonProps {
  href?: string;
}

export function AdminBackToAppButton({ href = '/app/home' }: AdminBackToAppButtonProps) {
  return (
    <Link href={href} className="admin-back-to-app" aria-label="Zur normalen App wechseln">
      Zur App
    </Link>
  );
}
