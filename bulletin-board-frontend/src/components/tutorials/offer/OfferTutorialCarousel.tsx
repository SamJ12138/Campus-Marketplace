"use client";

import { useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui";
import { markOfferTutorialComplete } from "@/lib/utils/offer-tutorial";
import { TutorialCarousel } from "@/components/tutorials/TutorialCarousel";
import { OfferTutorialSlide } from "./OfferTutorialSlide";
import { offerSlides } from "./slides";

export function OfferTutorialCarousel() {
  const show = useUIStore((s) => s.showOfferTutorial);
  const setShow = useUIStore((s) => s.setShowOfferTutorial);

  const handleClose = useCallback(() => {
    markOfferTutorialComplete();
    setShow(false);
  }, [setShow]);

  return (
    <TutorialCarousel
      slides={offerSlides}
      show={show}
      onClose={handleClose}
      onComplete={handleClose}
      ariaLabel="Offer tutorial"
      renderSlide={(slide) => <OfferTutorialSlide slide={slide} />}
      lastSlideButtonText="Got It"
    />
  );
}
