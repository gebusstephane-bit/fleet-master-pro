"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Car, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  VehicleStepSchema,
  VehicleStepData,
  formatRegistration,
} from "@/lib/onboarding/validation";
import { ONBOARDING_TEXTS } from "@/lib/onboarding/constants";
import { StepNavigation } from "@/components/onboarding/step-navigation";

interface StepVehicleProps {
  companyId: string;
  initialData?: Partial<VehicleStepData>;
  onSubmit: (data: VehicleStepData) => Promise<void>;
  onPrevious: () => void;
  isLoading: boolean;
}

export function StepVehicle({
  companyId,
  initialData,
  onSubmit,
  onPrevious,
  isLoading,
}: StepVehicleProps) {
  const texts = ONBOARDING_TEXTS.vehicle;
  const [formData, setFormData] = useState<Partial<VehicleStepData>>({
    companyId,
    registrationNumber: initialData?.registrationNumber || "",
    brand: initialData?.brand || "",
    model: initialData?.model || "",
    mileage: initialData?.mileage || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof VehicleStepData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRegistration(e.target.value);
    handleChange("registrationNumber", formatted);
  };

  const handleNext = async () => {
    try {
      const validated = VehicleStepSchema.parse(formData);
      await onSubmit(validated);
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
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
    formData.registrationNumber &&
    formData.brand &&
    formData.model &&
    formData.mileage !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <Car className="w-6 h-6 text-blue-400" />
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
        {/* Immatriculation */}
        <div className="space-y-2">
          <Label htmlFor="registration" className="text-blue-300">
            {texts.fields.registrationNumber.label}
          </Label>
          <Input
            id="registration"
            value={formData.registrationNumber}
            onChange={handleRegistrationChange}
            placeholder={texts.fields.registrationNumber.placeholder}
            maxLength={9}
            className="bg-slate-800/50 border-slate-700 focus:border-blue-500 font-mono uppercase"
          />
          <p className="text-xs text-slate-500">
            {texts.fields.registrationNumber.help}
          </p>
          {errors.registrationNumber && (
            <p className="text-sm text-red-400">{errors.registrationNumber}</p>
          )}
        </div>

        {/* Marque + Modèle */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand" className="text-blue-300">
              {texts.fields.brand.label}
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              placeholder={texts.fields.brand.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-blue-500"
            />
            {errors.brand && (
              <p className="text-sm text-red-400">{errors.brand}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="text-blue-300">
              {texts.fields.model.label}
            </Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => handleChange("model", e.target.value)}
              placeholder={texts.fields.model.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-blue-500"
            />
            {errors.model && (
              <p className="text-sm text-red-400">{errors.model}</p>
            )}
          </div>
        </div>

        {/* Kilométrage */}
        <div className="space-y-2">
          <Label htmlFor="mileage" className="text-blue-300 flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            {texts.fields.mileage.label}
          </Label>
          <Input
            id="mileage"
            type="number"
            min={0}
            value={formData.mileage}
            onChange={(e) =>
              handleChange("mileage", parseInt(e.target.value) || 0)
            }
            placeholder={texts.fields.mileage.placeholder}
            className="bg-slate-800/50 border-slate-700 focus:border-blue-500"
          />
          <p className="text-xs text-slate-500">{texts.fields.mileage.help}</p>
          {errors.mileage && (
            <p className="text-sm text-red-400">{errors.mileage}</p>
          )}
        </div>
      </motion.div>

      {/* Navigation */}
      <StepNavigation
        currentStep={3}
        onPrevious={onPrevious}
        onNext={handleNext}
        isLoading={isLoading}
        nextDisabled={!isValid}
      />
    </div>
  );
}
