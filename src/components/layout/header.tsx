"use client";

interface HeaderProps {
  user?: any;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="fixed top-0 left-20 right-0 h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 z-40 px-6 flex items-center justify-between">
      <div className="text-white font-semibold">
        FleetMaster Pro
      </div>
      <div className="text-white/60 text-sm">
        {user?.email || "Utilisateur"}
      </div>
    </header>
  );
}
