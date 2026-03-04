# 📊 RAPPORT D'AUDIT - Module SOS Garage
## Alignement Design System FleetMaster Pro

**Date**: 2026-03-04  
**Auteur**: Audit UI/UX Senior  
**Thème**: Cyan/Blue/Orange Premium Dark

---

## 🎨 TOKENS DU DESIGN SYSTEM (Référence)

### Palette Principale
| Token | Valeur | Usage |
|-------|--------|-------|
| `bg-background` | #09090b | Fond de page |
| `bg-[#0f172a]/60` | #0f172a/60% | Fond des cards (glass) |
| `border-cyan-500/15` | cyan/15% | Bordure par défaut |
| `border-cyan-500/30` | cyan/30% | Bordure hover/focus |
| `text-foreground` | #fafafa | Texte principal |
| `text-muted-foreground` | #71717a | Texte secondaire |
| `text-cyan-400` | #22d3ee | Accent principal |
| `text-emerald-400` | #34d399 | Succès |
| `text-amber-400` | #fbbf24 | Avertissement |
| `text-red-400` | #f87171 | Erreur/Urgence |
| `text-orange-400` | #fb923c | Important |

### Boutons (button.tsx)
- **Primary**: `bg-gradient-to-r from-cyan-500 to-blue-500` + glow cyan
- **Outline**: `border-cyan-500/30 bg-[#0f172a]/40 text-cyan-400`
- **Secondary**: `bg-[#1e293b] text-cyan-400 border-cyan-500/20`

### Inputs (input.tsx)
- **Default**: `bg-[#0f172a]/60 border-cyan-500/20`
- **Focus**: `border-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]`
- **Placeholder**: `text-slate-500`

---

## ❌ ÉCARTS DÉTECTÉS

### Fichier: `src/app/(dashboard)/sos/page.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| CardHeader | `bg-red-50` | `bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-white/10` | Glassmorphism + transparence |
| Card | `border-red-200` | `border-cyan-500/15` | Token border DS |
| Label | `text-gray-700` | `text-foreground` | Token texte DS |
| Label required | `text-red-500` | `text-red-400` | Token error DS |
| Boutons type panne (default) | `border-gray-200 bg-white` | `border-cyan-500/20 bg-[#0f172a]/40` | Glass card style |
| Boutons type panne (hover) | `hover:border-gray-300` | `hover:border-cyan-500/40 hover:bg-cyan-500/10` | Hover cyan DS |
| Boutons type panne (selected) | `border-red-500 bg-red-50` | `border-cyan-500 bg-cyan-500/20 ring-2 ring-cyan-500/30` | Sélection cyan DS |
| Text description | `text-gray-500` | `text-muted-foreground` | Token secondaire DS |
| Distance close (selected) | `border-green-500 bg-green-50` | `border-emerald-500 bg-emerald-500/20` | Token emerald DS |
| Distance far (selected) | `border-orange-500 bg-orange-50` | `border-orange-500 bg-orange-500/20` | Token orange DS |
| État rolling (selected) | `border-green-500 bg-green-50` | `border-emerald-500 bg-emerald-500/20` | Token emerald DS |
| État immobilized (selected) | `border-red-500 bg-red-50` | `border-red-500 bg-red-500/20` | Token red DS |
| Input localisation | `border rounded-lg focus:ring-red-500` | `bg-[#0f172a]/60 border-cyan-500/20 focus:border-cyan-500` | Input DS standard |
| Bouton submit | `bg-red-600 hover:bg-red-700` | `bg-gradient-to-r from-cyan-500 to-blue-500` | Button primary DS |

### Fichier: `src/components/sos/VehicleSelect.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Card (default) | `border-gray-200 hover:bg-gray-50` | `border-cyan-500/20 hover:border-cyan-500/40` | Glass card DS |
| Card (selected) | `ring-red-500 bg-red-50 border-red-200` | `ring-cyan-500 bg-cyan-500/10 border-cyan-500` | Sélection cyan DS |
| Icon container PL | `bg-blue-100 text-blue-700` | `bg-blue-500/20 text-blue-400` | Glass style |
| Icon container VL | `bg-green-100 text-green-700` | `bg-emerald-500/20 text-emerald-400` | Glass style |
| Badge PL | `bg-blue-100 text-blue-700` | `bg-blue-500/20 text-blue-400 border-blue-500/30` | Glass badge |
| Badge VL | `bg-green-100 text-green-700` | `bg-emerald-500/20 text-emerald-400 border-emerald-500/30` | Glass badge |
| Text marque/modèle | `text-gray-500` | `text-muted-foreground` | Token DS |
| Checkmark | `bg-red-600` | `bg-cyan-500` | Primary color |
| Empty state | `bg-gray-50 text-gray-500` | `bg-[#0f172a]/40 text-muted-foreground` | Glass style |

### Fichier: `src/components/sos/BreakdownTypeSelect.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Container (default) | `border-gray-200 bg-white` | `border-cyan-500/20 bg-[#0f172a]/40` | Glass card |
| Container (hover) | `hover:border-gray-300` | `hover:border-cyan-500/40` | Hover cyan |
| Container (selected) | `border-red-500 ring-red-200 bg-red-50` | `border-cyan-500 ring-cyan-500/30 bg-cyan-500/20` | Sélection cyan |
| Icon (selected) | `text-red-600` | `text-cyan-400` | Accent cyan |
| Label (selected) | `text-red-700` | `text-cyan-400` | Accent cyan |
| Couleur type pneu | `bg-yellow-100 text-yellow-700` | `bg-amber-500/20 text-amber-400` | Glass amber |
| Couleur type mécanique | `bg-red-100 text-red-700` | `bg-red-500/20 text-red-400` | Glass red |
| Couleur type frigo | `bg-blue-100 text-blue-700` | `bg-cyan-500/20 text-cyan-400` | Glass cyan |
| Couleur type électrique | `bg-amber-100 text-amber-700` | `bg-orange-500/20 text-orange-400` | Glass orange |
| Couleur type hayon | `bg-purple-100 text-purple-700` | `bg-violet-500/20 text-violet-400` | Glass violet |
| Couleur type carrosserie | `bg-gray-100 text-gray-700` | `bg-slate-500/20 text-slate-400` | Glass slate |

### Fichier: `src/components/sos/LocationForm.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Erreur container | `bg-red-50 border-red-200` | `bg-red-500/10 border-red-500/30` | Glass error |
| Erreur texte | `text-red-700` | `text-red-400` | Token red |
| Warning autoroute | `bg-amber-50 border-amber-200` | `bg-amber-500/10 border-amber-500/30` | Glass amber |
| Warning texte | `text-amber-800` | `text-amber-400` | Token amber |
| Label | - | `text-foreground` | Standard DS |
| Textarea | classe par défaut shadcn | `bg-[#0f172a]/60 border-cyan-500/20` | Input DS |

### Fichier: `src/components/sos/ImmobilizationSwitch.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Container (off) | `bg-gray-50 border-gray-200` | `bg-[#0f172a]/40 border-cyan-500/20` | Glass card |
| Container (on) | `bg-red-50 border-red-200` | `bg-red-500/10 border-red-500/30` | Glass red |
| Icon container (off) | `bg-gray-200 text-gray-600` | `bg-slate-500/20 text-slate-400` | Glass slate |
| Icon container (on) | `bg-red-100 text-red-600` | `bg-red-500/20 text-red-400` | Glass red |
| Description texte | `text-gray-500` | `text-muted-foreground` | Token DS |
| Alert immobilisation | `text-red-600 bg-red-100/50` | `text-red-400 bg-red-500/10` | Glass red |

### Fichier: `src/components/sos/HighwaySwitch.tsx`

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Container (off) | `bg-gray-50 border-gray-200` | `bg-[#0f172a]/40 border-cyan-500/20` | Glass card |
| Container (on) | `bg-red-50 border-red-300` | `bg-orange-500/10 border-orange-500/30` | Glass orange (warning) |
| Icon container (off) | `bg-gray-200 text-gray-600` | `bg-slate-500/20 text-slate-400` | Glass slate |
| Icon container (on) | `bg-red-100 text-red-600` | `bg-orange-500/20 text-orange-400` | Glass orange |
| Description texte | `text-gray-500` | `text-muted-foreground` | Token DS |
| Alert autoroute | `text-red-700 bg-red-100/50` | `text-orange-400 bg-orange-500/10` | Glass orange |

### Fichiers v4: EmergencyContractCard, InsuranceCard, GarageCard

**Note**: Ces cartes utilisent une sémantique de couleur forte (vert/orange/bleu) pour différencier les types de résultats. La correction conserve cette sémantique mais applique le style glassmorphism.

| Élément | Avant (Incorrect) | Après (Design System) | Justification |
|---------|-------------------|----------------------|---------------|
| Card Emergency | `border-green-500 bg-green-50` | `border-emerald-500 bg-emerald-500/10` | Glass emerald |
| Card Insurance | `border-orange-500 bg-orange-50` | `border-orange-500 bg-orange-500/10` | Glass orange |
| Card Garage | `border-blue-500 bg-blue-50` | `border-cyan-500 bg-cyan-500/10` | Glass cyan |
| Card Fallback | `border-gray-400 bg-gray-50` | `border-slate-500 bg-slate-500/10` | Glass slate |
| Numéro urgence | `bg-green-600` | `bg-gradient-to-r from-emerald-500 to-emerald-600` | Gradient DS |

---

## 📋 CHECKLIST DE VÉRIFICATION POST-CORRECTION

- [ ] Aucune classe `bg-{color}-50` ou `bg-{color}-100` restante
- [ ] Aucune classe `border-{color}-200` ou `border-{color}-300` restante
- [ ] Aucune classe `text-gray-{400,500,600,700}` restante
- [ ] Tous les inputs utilisent `bg-[#0f172a]/60 border-cyan-500/20`
- [ ] Tous les boutons primaires utilisent le gradient cyan-blue
- [ ] Les états hover utilisent les tokens `hover:border-cyan-500/40`
- [ ] Les sélections utilisent les tokens cyan avec ring
- [ ] Le dark mode est cohérent (pas de `bg-white` sans dark:)
- [ ] Les textes utilisent `text-foreground` ou `text-muted-foreground`

---

## 🎯 PRIORITÉS DE CORRECTION

1. **CRITIQUE**: `page.tsx` - Formulaire principal (impact utilisateur maximal)
2. **HAUTE**: `VehicleSelect.tsx` - Sélection véhicule très visible
3. **HAUTE**: `BreakdownTypeSelect.tsx` - Types de panne très visibles
4. **MOYENNE**: `LocationForm.tsx`, `ImmobilizationSwitch.tsx`, `HighwaySwitch.tsx`
5. **BASSE**: Composants v4 (affichés après soumission)
