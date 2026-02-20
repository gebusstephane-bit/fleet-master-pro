"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users2, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CompanyStepSchema,
  CompanyStepData,
  formatSiret,
} from "@/lib/onboarding/validation";
import { ONBOARDING_TEXTS } from "@/lib/onboarding/constants";
import { StepNavigation } from "@/components/onboarding/step-navigation";

interface StepCompanyProps {
  companyId: string;
  initialData?: Partial<CompanyStepData>;
  onSubmit: (data: CompanyStepData) => Promise<void>;
  onPrevious: () => void;
  isLoading: boolean;
}

export function StepCompany({
  companyId,
  initialData,
  onSubmit,
  onPrevious,
  isLoading,
}: StepCompanyProps) {
  const texts = ONBOARDING_TEXTS.company;
  const [formData, setFormData] = useState<Partial<CompanyStepData>>({
    companyId,
    name: initialData?.name || "",
    siret: initialData?.siret || "",
    fleetSize: initialData?.fleetSize || 1,
    industry: initialData?.industry || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CompanyStepData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSiretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSiret(e.target.value);
    handleChange("siret", formatted.slice(0, 14));
  };

  const handleNext = async () => {
    try {
      const validated = CompanyStepSchema.parse(formData);
      await onSubmit(validated);
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        // Zod error
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const newErrors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0];
          if (field) {
            newErrors[field] = issue.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const isValid =
    formData.name &&
    formData.siret?.length === 14 &&
    formData.fleetSize &&
    formData.industry;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">{texts.headline}</h2>
        <p className="text-slate-400">{texts.subheadline}</p>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Nom entreprise */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-cyan-300 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {texts.fields.name.label}
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder={texts.fields.name.placeholder}
            className="bg-slate-800/50 border-slate-700 focus:border-cyan-500"
          />
          {errors.name && (
            <p className="text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* SIRET */}
        <div className="space-y-2">
          <Label htmlFor="siret" className="text-cyan-300">
            {texts.fields.siret.label}
          </Label>
          <Input
            id="siret"
            value={formData.siret}
            onChange={handleSiretChange}
            placeholder={texts.fields.siret.placeholder}
            maxLength={14}
            className="bg-slate-800/50 border-slate-700 focus:border-cyan-500 font-mono"
          />
          <p className="text-xs text-slate-500">{texts.fields.siret.help}</p>
          {errors.siret && (
            <p className="text-sm text-red-400">{errors.siret}</p>
          )}
        </div>

        {/* Taille flotte + Secteur */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fleetSize" className="text-cyan-300 flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              {texts.fields.fleetSize.label}
            </Label>
            <Input
              id="fleetSize"
              type="number"
              min={1}
              max={10000}
              value={formData.fleetSize}
              onChange={(e) =>
                handleChange("fleetSize", parseInt(e.target.value) || 1)
              }
              placeholder={texts.fields.fleetSize.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-cyan-500"
            />
            {errors.fleetSize && (
              <p className="text-sm text-red-400">{errors.fleetSize}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry" className="text-cyan-300 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {texts.fields.industry.label}
            </Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              placeholder={texts.fields.industry.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-cyan-500"
            />
            {errors.industry && (
              <p className="text-sm text-red-400">{errors.industry}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <StepNavigation
        currentStep={2}
        onPrevious={onPrevious}
        onNext={handleNext}
        isLoading={isLoading}
        nextDisabled={!isValid}
      />
    </div>
  );
}
