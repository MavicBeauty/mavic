'use client';

import RegistroPanel from '@/components/RegistroPanel';

export default function AdminRegistroPage() {
  return (
    <RegistroPanel
      homeHref="/admin/dashboard"
      loginHref="/admin/login"
      configHref="/admin/registro/config"
      isAdmin
    />
  );
}
