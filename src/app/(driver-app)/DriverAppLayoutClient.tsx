'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ClipboardCheck,
  Fuel,
  AlertTriangle,
  Phone,
  LogOut,
  Download,
  X,
  User,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface DriverData {
  id: string;
  firstName: string;
  lastName: string;
  userId: string;
  companyId: string;
  role: string;
}

interface VehicleData {
  id: string;
  immatriculation: string;
  brand: string;
  model: string;
  mileage: number;
  status: string;
}

interface DriverAppLayoutClientProps {
  children: React.ReactNode;
  driver: DriverData | null;
  vehicle: VehicleData | null;
  isAdminPreview: boolean;
}

// ============================================================================
// COMPOSANT : Prompt d'installation PWA
// ============================================================================

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    
    // Vérifier si l'utilisateur a déjà refusé
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (hasDismissed) return;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };
  
  if (!showPrompt || isInstalled) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 safe-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5" />
          <div>
            <p className="font-medium text-sm">Installer FleetMaster</p>
            <p className="text-xs text-blue-100">Accès rapide depuis l&apos;écran d&apos;accueil</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700 h-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-blue-600 hover:bg-blue-50 h-8"
            onClick={handleInstall}
          >
            Installer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT : Navigation Item
// ============================================================================

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isActive: boolean;
}

function NavItem({ href, icon: Icon, label, badge, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors',
        isActive
          ? 'text-blue-400'
          : 'text-slate-400 hover:text-slate-200'
      )}
    >
      <div className="relative">
        <Icon className={cn('h-5 w-5', isActive && 'text-blue-400')} />
        {badge ? (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function DriverAppLayoutClient({
  children,
  driver,
  vehicle,
  isAdminPreview,
}: DriverAppLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  
  // Récupérer le nombre d'alertes non lues
  useEffect(() => {
    const fetchUnreadAlerts = async () => {
      const supabase = getSupabaseClient();
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .eq('user_id', driver?.userId || '');
      
      setUnreadAlerts(count || 0);
    };
    
    if (driver?.userId) {
      fetchUnreadAlerts();
    }
  }, [driver?.userId]);
  
  // Gestion de la déconnexion
  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    toast.success('Déconnexion réussie');
    router.push('/login');
  };
  
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col max-w-md mx-auto relative">
      {/* Prompt d'installation PWA */}
      <PWAInstallPrompt />
      
      {/* Banner aperçu admin */}
      {isAdminPreview && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-xs text-yellow-400 text-center safe-top">
          👁 Mode aperçu — Vue conducteur
        </div>
      )}
      
      {/* Header minimal */}
      <header className="sticky top-0 z-10 bg-[#0a0f1a]/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {driver ? (
                <>
                  {driver.firstName?.[0]}
                  {driver.lastName?.[0]}
                </>
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-white">
                {driver ? `${driver.firstName} ${driver.lastName}` : 'Conducteur'}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {vehicle ? vehicle.immatriculation : 'Aucun véhicule assigné'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Contenu principal */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0f1a] border-t border-slate-800 z-20 safe-bottom">
        <div className="grid grid-cols-5 h-16">
          <NavItem
            href="/driver-app"
            icon={Home}
            label="Accueil"
            isActive={pathname === '/driver-app' || pathname === '/driver-app/driver-app'}
          />
          <NavItem
            href="/driver-app/driver-app/inspection"
            icon={ClipboardCheck}
            label="Inspection"
            isActive={pathname.includes('/inspection')}
          />
          <NavItem
            href="/driver-app/driver-app/fuel"
            icon={Fuel}
            label="Carburant"
            isActive={pathname.includes('/fuel')}
          />
          <NavItem
            href="/driver-app/driver-app/sos"
            icon={Phone}
            label="SOS"
            isActive={pathname.includes('/sos')}
          />
          <NavItem
            href="/driver-app/driver-app/incident"
            icon={AlertTriangle}
            label="Incident"
            isActive={pathname.includes('/incident')}
          />
        </div>
      </nav>
    </div>
  );
}
