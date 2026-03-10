import Link from 'next/link';
import { ArrowLeft, Building2, Mail, Phone, Globe, Shield } from 'lucide-react';

export const metadata = {
  title: 'Mentions Légales | FleetMaster Pro',
  description: 'Mentions légales de la plateforme FleetMaster Pro',
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-white mb-8">
          Mentions Légales
        </h1>
        
        <p className="text-slate-400 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        {/* Contenu réel */}
        <div className="space-y-8 text-slate-300">
          
          {/* Section 1 : Éditeur */}
          <section className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">1. Éditeur du site</h2>
            </div>
            <div className="space-y-2 pl-9">
              <p><span className="text-slate-400">Raison sociale :</span> <strong className="text-white">GEBUS DIGITAL SAS</strong></p>
              <p><span className="text-slate-400">Forme juridique :</span> Société par Actions Simplifiée (SAS)</p>
              <p><span className="text-slate-400">Capital social :</span> 1000 €</p>
              <p><span className="text-slate-400">Numéro SIRET :</span> 123 456 789 00012</p>
              <p><span className="text-slate-400">Numéro TVA :</span> FR12 123 456 789</p>
              <p><span className="text-slate-400">RCS :</span> COUME B 123 456 789</p>
              <p><span className="text-slate-400">Siège social :</span> 11 Rue de verierres, 57220 COUME, France</p>
              <p><span className="text-slate-400">Directeur de publication :</span> Stéphane GEBUS, Président</p>
            </div>
          </section>

          {/* Section 2 : Contact */}
          <section className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">2. Contact</h2>
            </div>
            <div className="space-y-3 pl-9">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Email :</span>
                <a href="mailto:contact@fleetmaster.pro" className="text-cyan-400 hover:underline">contact@fleetmaster.fr</a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Téléphone :</span>
                <span className="text-white">06 58 08 27 25</span> (prix d'un appel local)
              </p>
              <p className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Site web :</span>
                <a href="https://fleetmaster.fr" className="text-cyan-400 hover:underline">https://fleetmaster.fr</a>
              </p>
            </div>
          </section>

          {/* Section 3 : Hébergement */}
          <section className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">3. Hébergement</h2>
            <div className="space-y-4 pl-2">
              <div className="bg-[#0a0f1a] p-4 rounded-lg border-l-4 border-cyan-400">
                <p className="font-semibold text-white">Vercel Inc.</p>
                <p className="text-sm text-slate-400">340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
                <p className="text-sm text-slate-400">Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">vercel.com</a></p>
              </div>
              <div className="bg-[#0a0f1a] p-4 rounded-lg border-l-4 border-cyan-400">
                <p className="font-semibold text-white">Supabase Inc.</p>
                <p className="text-sm text-slate-400">970 Toomey Ave, San Francisco, CA 94110, USA</p>
                <p className="text-sm text-slate-400">Site web : <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">supabase.com</a></p>
              </div>
            </div>
          </section>

          {/* Section 4 : Propriété intellectuelle */}
          <section className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">4. Propriété intellectuelle</h2>
            <div className="space-y-3 text-sm leading-relaxed pl-2">
              <p>
                L'ensemble du contenu du site FleetMaster Pro (textes, images, logos, icônes, graphismes, logiciels, base de données) 
                est la propriété exclusive de <strong>GEBUS DIGITAL SAS</strong> ou de ses partenaires.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale ou partielle 
                du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit est interdite 
                sans l'autorisation écrite préalable.
              </p>
              <p>
                Toute exploitation non autorisée du site ou de son contenu engage la responsabilité de l'utilisateur et constitue 
                une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
              </p>
            </div>
          </section>

          {/* Section 5 : CNIL */}
          <section className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">5. Déclaration CNIL</h2>
            </div>
            <div className="space-y-3 pl-9 text-sm">
              <p>
                Conformément à la loi n°78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés, 
                et au Règlement Général sur la Protection des Données (RGPD), le traitement des données personnelles collectées 
                sur le site a fait l'objet d'une déclaration auprès de la CNIL.
              </p>
              <div className="bg-[#0a0f1a] p-4 rounded-lg mt-3 border border-slate-700">
                <p className="font-semibold text-white mb-1">Délégué à la Protection des Données (DPO) :</p>
                <p>Stéphane GEBUS</p>
                <p>Email : <a href="mailto:contact@fleetmaster.fr" className="text-cyan-400 hover:underline">contact@fleetmaster.fr</a></p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} FleetMaster Pro - Tous droits réservés</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/politique-confidentialite" className="hover:text-cyan-400 transition-colors">Politique de confidentialité</Link>
            <Link href="/cgv" className="hover:text-cyan-400 transition-colors">CGV</Link>
          </div>
        </div>
      </div>
    </div>
  );
}