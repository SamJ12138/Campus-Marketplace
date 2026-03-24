"use client";

import { useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui";
import { markOfferPostingTutorialComplete } from "@/lib/utils/offer-posting-tutorial";
import { TutorialCarousel } from "@/components/tutorials/TutorialCarousel";
import { OfferPostingTutorialSlide } from "./OfferPostingTutorialSlide";
import { offerPostingSlides } from "./slides";

export function OfferPostingTutorialCarousel() {
  const show = useUIStore((s) => s.showOfferPostingTutorial);
  const setShow = useUIStore((s) => s.setShowOfferPostingTutorial);

  const handleClose = useCallback(() => {
    markOfferPostingTutorialComplete();
    setShow(false);
  }, [setShow]);

  return (
    <TutorialCarousel
      slides={offerPostingSlides}
      show={show}
      onClose={handleClose}
      onComplete={handleClose}
      ariaLabel="Offer posting tutorial"
      renderSlide={(slide) => <OfferPostingTutorialSlide slide={slide} />}
      lastSlideButtonText="Start Offering"
    />
  );
}
