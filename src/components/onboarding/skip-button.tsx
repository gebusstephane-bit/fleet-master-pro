"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface SkipButtonProps {
  onSkip: () => Promise<void>;
  isLoading?: boolean;
}

export function SkipButton({ onSkip, isLoading = false }: SkipButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSkip = async () => {
    await onSkip();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 group">
          Passer l'installation
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f172a] border-cyan-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Passer l'installation ?
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Vous pourrez configurer votre entreprise et ajouter vos véhicules
            plus tard depuis les paramètres.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-300">
            Certaines fonctionnalités comme les prédictions IA nécessitent au
            moins un véhicule enregistré.
          </p>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Continuer l'installation
          </Button>
          <Button
            onClick={handleSkip}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0"
          >
            {isLoading ? "Chargement..." : "Passer quand même"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
