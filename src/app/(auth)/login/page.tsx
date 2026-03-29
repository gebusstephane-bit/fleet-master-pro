/**
 * Page de connexion - Version propre et fonctionnelle
 */

'use client';

import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
