"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useUIStore } from "@/lib/stores/ui";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/utils/onboarding";
import { OnboardingSlide } from "./OnboardingSlide";
import { slides } from "./slides";

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

const transition = {
  x: { type: "spring" as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

const fadeTransition = { duration: 0.3 };

export function OnboardingCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const isLoading = useAuthStore((s) => s.isLoading);
  const showOnboarding = useUIStore((s) => s.showOnboarding);
  const setShowOnboarding = useUIStore((s) => s.setShowOnboarding);

  // Show carousel for all first-time visitors
  useEffect(() => {
    if (!isLoading && !hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, [isLoading, setShowOnboarding]);

  const close = useCallback(() => {
    markOnboardingComplete();
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  const goNext = useCallback(() => {
    if (currentSlide === slides.length - 1) {
      close();
    } else {
      setDirection(1);
      setCurrentSlide((s) => s + 1);
    }
  }, [currentSlide, close]);

  const goBack = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation + focus trap + body scroll lock
  useEffect(() => {
    if (!showOnboarding) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goBack();
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showOnboarding, close, goNext, goBack]);

  if (!showOnboarding) return null;

  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;
  const progress = ((currentSlide + 1) / slides.length) * 100;

  const activeVariants = prefersReduced ? fadeVariants : variants;
  const activeTransition = prefersReduced ? fadeTransition : transition;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div
        ref={dialogRef}
        className="relative flex w-full max-w-xl flex-col rounded-2xl border border-border bg-popover p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Skip button */}
        <button
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Slide content with animation */}
        <div className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={activeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={activeTransition}
              className="w-full"
              aria-live="polite"
            >
              <OnboardingSlide slide={slides[currentSlide]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress section */}
        <div className="mt-6 space-y-4">
          {/* Step indicator + progress bar */}
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Step {currentSlide + 1} of {slides.length}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={isFirst}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors",
                "hover:bg-accent",
                "disabled:pointer-events-none disabled:opacity-0",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              onClick={goNext}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-md px-6 text-sm font-medium transition-colors",
                isLast
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {isLast ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
