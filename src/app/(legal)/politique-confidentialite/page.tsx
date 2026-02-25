import Link from 'next/link';
import { ArrowLeft, Shield, Mail, MapPin, Phone, FileText, Clock, Trash2, Download, Ban, UserCheck } from 'lucide-react';
import { CookieResetButton } from './CookieResetButton';

export const metadata = {
  title: 'Politique de Confidentialité | FleetMaster Pro',
  description: 'Politique de confidentialité et protection des données personnelles conforme au RGPD - FleetMaster Pro',
};

export default function PolitiqueConfidentialitePage() {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-400">
            Dernière mise à jour : <span className="text-cyan-400">{new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>

        {/* Introduction RGPD */}
        <div className="mb-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Engagement RGPD</h2>
              <p className="text-slate-300 leading-relaxed">
                FleetMaster Pro s&apos;engage à protéger vos données personnelles conformément au 
                <strong className="text-cyan-300"> Règlement Général sur la Protection des Données (RGPD)</strong> 
                (Règlement UE 2016/679) et à la <strong className="text-cyan-300">Loi Informatique et Libertés</strong> modifiée. 
                Cette politique détaille comment nous collectons, utilisons et protégeons vos informations.
              </p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="space-y-10 text-slate-300">
          
          {/* Section 1: Responsable du traitement */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              1. Responsable du traitement
            </h2>
            <div className="bg-[#0f172a]/50 p-5 rounded-lg border border-slate-700/50 space-y-3">
              <p className="font-medium text-white">FleetMaster Pro</p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>123 Avenue de la Logistique, 75012 Paris, France</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <a href="mailto:privacy@fleetmaster.fr" className="text-cyan-400 hover:text-cyan-300">
                    privacy@fleetmaster.fr
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>+33 1 23 45 67 89</span>
                </p>
              </div>
              <p className="text-sm text-slate-400 mt-3 pt-3 border-t border-slate-700/50">
                <strong>SIRET :</strong> 123 456 789 00012 | 
                <strong>RCS :</strong> Paris B 123 456 789
              </p>
            </div>
          </section>

          {/* Section 2: Données collectées */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              2. Données collectées
            </h2>
            <div className="space-y-4">
              <p className="leading-relaxed">
                Nous collectons uniquement les données nécessaires à la fourniture de nos services :
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50">
                  <h3 className="font-medium text-cyan-300 mb-2">Données d&apos;identification</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-400">
                    <li>Nom et prénom</li>
                    <li>Adresse email professionnelle</li>
                    <li>Numéro de téléphone</li>
                    <li>Poste/fonction dans l&apos;entreprise</li>
                  </ul>
                </div>
                
                <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50">
                  <h3 className="font-medium text-cyan-300 mb-2">Données d&apos;entreprise</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-400">
                    <li>Raison sociale</li>
                    <li>SIRET</li>
                    <li>Adresse du siège social</li>
                    <li>Taille de la flotte</li>
                  </ul>
                </div>
                
                <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50">
                  <h3 className="font-medium text-cyan-300 mb-2">Données de connexion</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-400">
                    <li>Adresse IP</li>
                    <li>Logs de connexion</li>
                    <li>Historique des actions</li>
                    <li>Cookies fonctionnels</li>
                  </ul>
                </div>
                
                <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50">
                  <h3 className="font-medium text-cyan-300 mb-2">Données de paiement</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-400">
                    <li>Identifiant client Stripe</li>
                    <li>Historique des transactions</li>
                    <li>Date d&apos;expiration de l&apos;abonnement</li>
                    <li className="text-green-400">→ Données bancaires NON stockées (Stripe)</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Finalités */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              3. Finalités du traitement
            </h2>
            <p className="mb-4 leading-relaxed">
              Vos données sont traitées pour les finalités suivantes, conformément à l&apos;article 6 du RGPD :
            </p>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-[#0f172a]/30 rounded-lg border-l-2 border-cyan-500/50">
                <span className="text-cyan-400 font-mono text-sm">01</span>
                <div>
                  <strong className="text-white">Exécution du contrat</strong>
                  <p className="text-sm text-slate-400">Gestion de votre compte, accès au service, support client</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-[#0f172a]/30 rounded-lg border-l-2 border-cyan-500/50">
                <span className="text-cyan-400 font-mono text-sm">02</span>
                <div>
                  <strong className="text-white">Obligations légales</strong>
                  <p className="text-sm text-slate-400">Facturation, comptabilité, réponse aux réquisitions judiciaires</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-[#0f172a]/30 rounded-lg border-l-2 border-cyan-500/50">
                <span className="text-cyan-400 font-mono text-sm">03</span>
                <div>
                  <strong className="text-white">Intérêt légitime</strong>
                  <p className="text-sm text-slate-400">Sécurité, prévention des fraudes, amélioration du service</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-[#0f172a]/30 rounded-lg border-l-2 border-cyan-500/50">
                <span className="text-cyan-400 font-mono text-sm">04</span>
                <div>
                  <strong className="text-white">Consentement</strong>
                  <p className="text-sm text-slate-400">Analyse d&apos;audience (PostHog), communications marketing</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Durée de conservation */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              4. Durée de conservation
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Catégorie</th>
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Durée</th>
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Justification</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Données de compte actif</td>
                    <td className="py-3 px-2 text-green-400">Durée du contrat</td>
                    <td className="py-3 px-2 text-slate-400">Nécessaire à la prestation</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Données après résiliation</td>
                    <td className="py-3 px-2 text-yellow-400">1 an</td>
                    <td className="py-3 px-2 text-slate-400">Défense en justice, contentieux</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Données de facturation</td>
                    <td className="py-3 px-2 text-yellow-400">10 ans</td>
                    <td className="py-3 px-2 text-slate-400">Obligation légale (Code de commerce)</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Cookies analytiques</td>
                    <td className="py-3 px-2 text-red-400">13 mois max</td>
                    <td className="py-3 px-2 text-slate-400">Recommandations CNIL</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2">Logs de sécurité</td>
                    <td className="py-3 px-2 text-yellow-400">1 an</td>
                    <td className="py-3 px-2 text-slate-400">Sécurité du système d&apos;information</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Vos droits */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              5. Vos droits (Articles 15-22 RGPD)
            </h2>
            <p className="mb-4 leading-relaxed">
              Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Droit d&apos;accès (Art. 15)
                </h3>
                <p className="text-sm text-slate-400">
                  Obtenir une copie de vos données personnelles et des informations sur leur traitement.
                </p>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Droit de rectification (Art. 16)
                </h3>
                <p className="text-sm text-slate-400">
                  Demander la correction des données inexactes ou incomplètes.
                </p>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Droit à l&apos;effacement (Art. 17)
                </h3>
                <p className="text-sm text-slate-400">
                  Demander la suppression de vos données dans certains cas (« droit à l&apos;oubli »).
                </p>
                <p className="text-xs text-cyan-400 mt-2">
                  → Action disponible dans <Link href="/settings/profile" className="underline">Paramètres &gt; Profil</Link>
                </p>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-cyan-400" />
                  Droit de limitation (Art. 18)
                </h3>
                <p className="text-sm text-slate-400">
                  Demander le gel du traitement de vos données dans certains cas.
                </p>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Portabilité (Art. 20)
                </h3>
                <p className="text-sm text-slate-400">
                  Recevoir vos données dans un format structuré et les transférer.
                </p>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Droit d&apos;opposition (Art. 21)
                </h3>
                <p className="text-sm text-slate-400">
                  Vous opposer au traitement, notamment pour la prospection.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-sm text-cyan-200">
                <strong>Comment exercer vos droits ?</strong> Envoyez votre demande à{' '}
                <a href="mailto:privacy@fleetmaster.fr" className="underline hover:text-cyan-100">
                  privacy@fleetmaster.fr
                </a>{' '}
                ou par courrier à notre adresse postale. Nous répondons sous 30 jours maximum.
              </p>
            </div>
          </section>

          {/* Section 6: Cookies et traceurs */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              6. Cookies et traceurs
            </h2>
            <div className="space-y-4">
              <p className="leading-relaxed">
                Notre site utilise des cookies conformément aux recommandations de la CNIL :
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                  <div>
                    <strong className="text-green-300">Cookies essentiels</strong>
                    <p className="text-sm text-slate-400">
                      Nécessaires au fonctionnement du site (authentification, sécurité). 
                      Pas de consentement requis.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                  <div>
                    <strong className="text-yellow-300">Cookies analytiques (PostHog)</strong>
                    <p className="text-sm text-slate-400">
                      Mesure d&apos;audience et analyse comportementale. 
                      <span className="text-yellow-400"> Consentement requis.</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-4">
                Vous pouvez modifier vos préférences à tout moment via la bannière cookies 
                ou en cliquant sur &quot;Gérer les cookies&quot; en bas de page.
              </p>
            </div>
          </section>

          {/* Section 7: Sécurité */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              7. Sécurité des données
            </h2>
            <p className="leading-relaxed mb-4">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées 
              pour protéger vos données :
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Chiffrement des données en transit (TLS 1.3) et au repos (AES-256)</li>
              <li>Authentification forte (MFA) obligatoire pour les accès admin</li>
              <li>Row Level Security (RLS) sur la base de données Supabase</li>
              <li>Audit logs de toutes les actions sensibles</li>
              <li>Sauvegardes chiffrées quotidiennes avec conservation 30 jours</li>
              <li>Certification ISO 27001 de nos hébergeurs (Supabase, Vercel)</li>
            </ul>
          </section>

          {/* Section 8: Sous-traitants */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              8. Sous-traitants (DPA signés)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Prestataire</th>
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Pays</th>
                    <th className="text-left py-3 px-2 text-cyan-300 font-medium">Service</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Supabase</td>
                    <td className="py-3 px-2">UE (Francfort)</td>
                    <td className="py-3 px-2 text-slate-400">Base de données, auth, storage</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Vercel Inc.</td>
                    <td className="py-3 px-2">UE (Dublin)</td>
                    <td className="py-3 px-2 text-slate-400">Hébergement applicatif</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-3 px-2">Stripe Inc.</td>
                    <td className="py-3 px-2">USA (Privacy Shield)</td>
                    <td className="py-3 px-2 text-slate-400">Paiement sécurisé</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2">PostHog Inc.</td>
                    <td className="py-3 px-2">UE (Francfort)</td>
                    <td className="py-3 px-2 text-slate-400">Analyse d&apos;audience (opt-in)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 9: Contact DPO */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              9. Contact DPO
            </h2>
            <div className="bg-[#0f172a]/50 p-5 rounded-lg border border-slate-700/50">
              <p className="mb-4">
                Pour toute question relative à la protection de vos données ou pour exercer vos droits, 
                contactez notre Délégué à la Protection des Données :
              </p>
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <a href="mailto:privacy@fleetmaster.fr" className="text-cyan-400 hover:text-cyan-300 font-medium">
                    privacy@fleetmaster.fr
                  </a>
                </p>
                <p className="text-sm text-slate-400">
                  Réponse garantie sous 48h ouvrées. Si vous n&apos;êtes pas satisfait de notre réponse, 
                  vous pouvez saisir la{' '}
                  <a 
                    href="https://www.cnil.fr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    CNIL
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* Récapitulatif des actions RGPD disponibles */}
          <section className="pt-6 border-t border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Actions disponibles dans l&apos;application
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/settings/profile"
                className="flex items-center gap-3 p-4 bg-[#0f172a]/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all group"
              >
                <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Supprimer mon compte</h3>
                  <p className="text-sm text-slate-400">Exercer mon droit à l&apos;effacement (Art. 17)</p>
                </div>
              </Link>

              <Link 
                href="/settings/profile"
                className="flex items-center gap-3 p-4 bg-[#0f172a]/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all group"
              >
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Modifier mes données</h3>
                  <p className="text-sm text-slate-400">Exercer mon droit de rectification (Art. 16)</p>
                </div>
              </Link>

              <Link 
                href="mailto:privacy@fleetmaster.fr?subject=Demande%20d'accès%20RGPD%20-%20Mes%20données"
                className="flex items-center gap-3 p-4 bg-[#0f172a]/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all group"
              >
                <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <Download className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Télécharger mes données</h3>
                  <p className="text-sm text-slate-400">Exercer mon droit de portabilité (Art. 20)</p>
                </div>
              </Link>

              <CookieResetButton />
            </div>
          </section>

          {/* Footer légal */}
          <div className="mt-12 pt-8 border-t border-slate-700/50 text-center text-sm text-slate-500">
            <p>
              Cette politique de confidentialité est susceptible d&apos;être modifiée. 
              Toute modification substantielle vous sera notifiée par email.
            </p>
            <p className="mt-2">
              © {new Date().getFullYear()} FleetMaster Pro. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
