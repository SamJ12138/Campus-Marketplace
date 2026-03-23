"use client";

import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useUIStore } from "@/lib/stores/ui";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/utils/onboarding";
import { TutorialCarousel } from "@/components/tutorials/TutorialCarousel";
import { OnboardingSlide } from "./OnboardingSlide";
import { slides } from "./slides";

export function OnboardingCarousel() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const showOnboarding = useUIStore((s) => s.showOnboarding);
  const setShowOnboarding = useUIStore((s) => s.setShowOnboarding);

  // Show carousel for all first-time visitors
  useEffect(() => {
    if (!isLoading && !hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, [isLoading, setShowOnboarding]);

  const handleClose = useCallback(() => {
    markOnboardingComplete();
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  return (
    <TutorialCarousel
      slides={slides}
      show={showOnboarding}
      onClose={handleClose}
      onComplete={handleClose}
      ariaLabel="Welcome tour"
      renderSlide={(slide) => <OnboardingSlide slide={slide} />}
      lastSlideButtonText="Get Started"
    />
  );
}
