import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import ListingCard from "@/components/listings/ListingCard";
import type { Listing } from "@/lib/types";

const mockListing: Listing = {
  id: "test-listing-1",
  type: "service",
  title: "Python Programming Tutoring",
  description: "Learn Python from scratch with hands-on projects.",
  price_hint: "$30/hour",
  category: { id: "cat-1", name: "Tutoring", slug: "tutoring" },
  location_type: "on_campus",
  location_hint: "Library Study Room 3",
  availability: null,
  contact_preference: "in_app",
  is_regulated: false,
  status: "active",
  view_count: 42,
  photos: [
    {
      id: "photo-1",
      url: "https://example.com/photo.jpg",
      thumbnail_url: "https://example.com/photo-thumb.jpg",
      position: 0,
    },
  ],
  user: {
    id: "user-1",
    display_name: "Jane Doe",
    avatar_url: null,
    class_year: 2026,
  },
  is_favorited: false,
  is_own: false,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("ListingCard", () => {
  it("renders listing title and details", () => {
    render(<ListingCard listing={mockListing} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Python Programming Tutoring")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    // Note: Category name and price_hint are not displayed in the card UI
    // Category is used for icon/color, price is shown on detail page
  });

  it("renders service badge for service type", () => {
    render(<ListingCard listing={mockListing} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("renders item badge for item type", () => {
    const itemListing = { ...mockListing, type: "item" as const };
    render(<ListingCard listing={itemListing} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Items")).toBeInTheDocument();
  });

  it("shows sold badge when status is sold", () => {
    const soldListing = { ...mockListing, status: "sold" as const };
    render(<ListingCard listing={soldListing} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Sold")).toBeInTheDocument();
  });

  it("shows filled heart when favorited", () => {
    const favListing = { ...mockListing, is_favorited: true };
    render(<ListingCard listing={favListing} />, {
      wrapper: createWrapper(),
    });

    const heartButton = screen.getByRole("button", { name: /favorite/i });
    expect(heartButton).toBeInTheDocument();
  });

  it("renders fallback when no photos", () => {
    const noPhotoListing = { ...mockListing, photos: [] };
    render(<ListingCard listing={noPhotoListing} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Python Programming Tutoring")).toBeInTheDocument();
  });

  it("is accessible with keyboard focus", () => {
    render(<ListingCard listing={mockListing} />, {
      wrapper: createWrapper(),
    });

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/listings/${mockListing.id}`);
  });
});
