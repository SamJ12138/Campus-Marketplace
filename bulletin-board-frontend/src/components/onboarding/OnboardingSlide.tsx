import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { DeviceFrame } from "./DeviceFrame";
import type { SlideData } from "./slides";

interface OnboardingSlideProps {
  slide: SlideData;
}

export function OnboardingSlide({ slide }: OnboardingSlideProps) {
  const Icon = slide.icon;

  return (
    <div className="flex w-full flex-col items-center px-4 sm:px-8">
      {/* Visual area */}
      <div className="relative mb-6 w-full max-w-lg">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5" />

        {slide.image ? (
          <div className="relative p-4 sm:p-6">
            <DeviceFrame>
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 90vw, 512px"
                priority
              />
            </DeviceFrame>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <Image
              src="/images/logo-v2.png"
              alt="GimmeDat"
              width={80}
              height={80}
              className="mb-4"
            />
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
            slide.accentColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold">{slide.title}</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {slide.description}
        </p>
      </div>
    </div>
  );
}
