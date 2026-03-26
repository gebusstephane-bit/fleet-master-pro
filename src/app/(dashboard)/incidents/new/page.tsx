import { IncidentForm } from '@/components/incidents/incident-form';

export const metadata = {
  title: 'Déclarer un sinistre — Fleet-Master',
};

export default function NewIncidentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Déclarer un sinistre</h1>
        <p className="text-slate-400">Remplissez les 3 étapes pour enregistrer le dossier</p>
      </div>
      <IncidentForm />
    </div>
  );
}
