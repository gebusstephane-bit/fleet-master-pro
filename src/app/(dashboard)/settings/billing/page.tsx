'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Building2,
  Calendar,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSubscription, useSubscriptionLimits, useCreateCheckout, useCancelSubscription } from '@/hooks/use-subscription';
import { PLANS, formatPrice, PlanId, ACTIVE_PLANS } from '@/lib/plans';

// Helper pour convertir le plan de la DB (uppercase) vers la clé PLANS (lowercase)
function getPlanKey(dbPlan: string): PlanId {
  return dbPlan.toLowerCase() as PlanId;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const planParam = searchParams.get('plan');
  
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: limits, isLoading: limitsLoading } = useSubscriptionLimits();
  const createCheckout = useCreateCheckout();
  const cancelSub = useCancelSubscription();
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (subLoading || limitsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const currentPlanKey = getPlanKey(subscription?.plan || 'ESSENTIAL');
  const currentPlan = PLANS[currentPlanKey];
  const isUnlimited = currentPlanKey === 'unlimited';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Facturation</h1>
        <p className="text-gray-500">Gérez votre abonnement et vos paiements</p>
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
        >
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Paiement réussi !</p>
            <p className="text-sm text-green-600">
              Votre abonnement a été mis à jour{planParam ? ` vers le plan ${planParam}` : ''}.
            </p>
          </div>
        </motion.div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Plan actuel : {currentPlan.name}
              </CardTitle>
              <CardDescription>
                {subscription?.status === 'TRIALING' 
                  ? `Essai gratuit jusqu'au ${new Date(subscription.trial_ends_at).toLocaleDateString('fr-FR')}`
                  : `Renouvellement le ${new Date(subscription?.current_period_end).toLocaleDateString('fr-FR')}`
                }
              </CardDescription>
            </div>
            {isUnlimited ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                <Building2 className="h-4 w-4 mr-1" />
                Illimité
              </span>
            ) : (
              <span className="text-2xl font-bold">
                {formatPrice(currentPlan.priceMonthly)}
                <span className="text-sm font-normal text-gray-500">/mois</span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Véhicules</span>
                <span className="font-medium">{limits?.vehicleCount} / {limits?.vehicleLimit}</span>
              </div>
              <Progress 
                value={(limits?.vehicleCount || 0) / (limits?.vehicleLimit || 1) * 100} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Utilisateurs</span>
                <span className="font-medium">{limits?.userCount} / {limits?.userLimit}</span>
              </div>
              <Progress 
                value={(limits?.userCount || 0) / (limits?.userLimit || 1) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Actions */}
          {!isUnlimited && subscription?.plan !== 'STARTER' && (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="text-red-600 hover:bg-red-50"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelSub.isPending}
              >
                {cancelSub.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  'Annuler l\'abonnement'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Confirmer l'annulation ?</p>
                <p className="text-sm text-amber-700 mt-1">
                  Vous resterez sur le plan {currentPlan.name} jusqu'au 
                  {new Date(subscription?.current_period_end).toLocaleDateString('fr-FR')}, 
                  puis perdrez l'accès au dashboard.
                </p>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Garder mon abonnement
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => cancelSub.mutate()}
                    disabled={cancelSub.isPending}
                  >
                    {cancelSub.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      'Confirmer l\'annulation'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Options */}
      {!isUnlimited && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Upgrader votre plan</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {ACTIVE_PLANS.map((planKey) => {
              const plan = PLANS[planKey];
              const dbPlanName = planKey.toUpperCase();
              const isCurrent = currentPlanKey === planKey;
              const canUpgrade = ['ESSENTIAL', 'PRO'].includes(subscription?.plan || 'ESSENTIAL') && 
                ['ESSENTIAL', 'PRO', 'UNLIMITED'].indexOf(dbPlanName) > 
                ['ESSENTIAL', 'PRO', 'UNLIMITED'].indexOf(subscription?.plan || 'ESSENTIAL');

              return (
                <Card 
                  key={planKey} 
                  className={`${isCurrent ? 'border-blue-500 bg-blue-50/30' : ''} ${
                    planKey === 'unlimited' ? 'bg-gray-900 text-white' : ''
                  }`}
                >
                  <CardHeader>
                    <CardTitle className={`text-lg ${planKey === 'unlimited' ? 'text-white' : ''}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={planKey === 'unlimited' ? 'text-gray-400' : ''}>
                      Jusqu'à {plan.maxVehicles} véhicules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-2xl font-bold">{plan.priceMonthly}€</span>
                      <span className="text-gray-500">/mois</span>
                    </div>

                    {isCurrent ? (
                      <Button disabled className="w-full">
                        Plan actuel
                      </Button>
                    ) : planKey === 'unlimited' ? (
                      <Button asChild className="w-full bg-white text-gray-900 hover:bg-gray-100">
                        <Link href="/pricing">
                          Contacter les ventes
                        </Link>
                      </Button>
                    ) : canUpgrade ? (
                      <Button 
                        className="w-full"
                        onClick={() => createCheckout.mutate({ plan: dbPlanName, yearly: false })}
                        disabled={createCheckout.isPending}
                      >
                        {createCheckout.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <>
                            Upgrader
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button disabled className="w-full" variant="outline">
                        Déjà inclus
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Facturation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique de facturation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune facture pour le moment</p>
            <p className="text-sm mt-1">Les factures apparaîtront ici après votre premier paiement</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
