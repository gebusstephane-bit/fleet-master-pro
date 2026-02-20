"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DriverStepSchema,
  DriverStepData,
  formatPhone,
} from "@/lib/onboarding/validation";
import { ONBOARDING_TEXTS } from "@/lib/onboarding/constants";
import { StepNavigation } from "@/components/onboarding/step-navigation";

interface StepDriverProps {
  companyId: string;
  initialData?: Partial<DriverStepData>;
  onSubmit: (data: DriverStepData | null) => Promise<void>;
  onPrevious: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function StepDriver({
  companyId,
  initialData,
  onSubmit,
  onPrevious,
  onSkip,
  isLoading,
}: StepDriverProps) {
  const texts = ONBOARDING_TEXTS.driver;
  const [formData, setFormData] = useState<Partial<DriverStepData>>({
    companyId,
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof DriverStepData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    handleChange("phone", formatted);
  };

  const handleNext = async () => {
    // Vérifier si tous les champs sont vides = skip
    const hasAnyData =
      formData.firstName || formData.lastName || formData.email || formData.phone;

    if (!hasAnyData) {
      onSkip();
      return;
    }

    try {
      const validated = DriverStepSchema.parse(formData);
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
    (formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone) ||
    (!formData.firstName &&
      !formData.lastName &&
      !formData.email &&
      !formData.phone);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-6 h-6 text-orange-400" />
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
        {/* Nom + Prénom */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-orange-300">
              {texts.fields.firstName.label}
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder={texts.fields.firstName.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-orange-500"
            />
            {errors.firstName && (
              <p className="text-sm text-red-400">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-orange-300">
              {texts.fields.lastName.label}
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder={texts.fields.lastName.placeholder}
              className="bg-slate-800/50 border-slate-700 focus:border-orange-500"
            />
            {errors.lastName && (
              <p className="text-sm text-red-400">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-orange-300 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {texts.fields.email.label}
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder={texts.fields.email.placeholder}
            className="bg-slate-800/50 border-slate-700 focus:border-orange-500"
          />
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Téléphone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-orange-300 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {texts.fields.phone.label}
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder={texts.fields.phone.placeholder}
            className="bg-slate-800/50 border-slate-700 focus:border-orange-500"
          />
          {errors.phone && (
            <p className="text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">
          Laissez tous les champs vides pour passer cette étape.
        </p>
      </motion.div>

      {/* Navigation */}
      <StepNavigation
        currentStep={4}
        onPrevious={onPrevious}
        onNext={handleNext}
        onSkip={onSkip}
        isLoading={isLoading}
        nextDisabled={!isValid}
      />
    </div>
  );
}
