'use client';

import { useEffect, useState } from 'react';

export default function DashboardSimple() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test-auth')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setUser(data.user);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-white p-8">Chargement...</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Bienvenue {user?.email}</p>
    </div>
  );
}
