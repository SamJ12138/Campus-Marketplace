// Landing page content configuration for SEO landing pages
// Includes local Gettysburg/Adams County specific content

import { SERVICE_CATEGORIES, LOCAL_AREAS } from "@/lib/constants/seo";

export interface ServiceLandingContent {
  slug: string;
  title: string;
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  keywords: string[];
  benefits: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  ctaText: string;
  ctaLink: string;
  feedFilter: {
    type?: "item" | "service";
    category?: string;
  };
}

export interface LocationLandingContent {
  slug: string;
  name: string;
  state: string;
  fullName: string;
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  keywords: string[];
  localFeatures: string[];
  landmarks: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  ctaText: string;
}

// Service category landing page content
export const SERVICE_LANDING_CONTENT: Record<string, ServiceLandingContent> = {
  textbooks: {
    slug: SERVICE_CATEGORIES.textbooks.slug,
    title: "Gettysburg College Textbooks for Sale",
    heroTitle: "Buy & Sell Textbooks at Gettysburg College",
    heroSubtitle:
      "Save up to 70% on textbooks from fellow Gettysburg students",
    description:
      "Find affordable used textbooks from Gettysburg College students. Buy and sell course materials, study guides, and academic resources within your campus community.",
    keywords: [...SERVICE_CATEGORIES.textbooks.keywords],
    benefits: [
      "Save up to 70% compared to bookstore prices",
      "Buy from verified Gettysburg students",
      "Quick campus meetups for exchanges",
      "Sell your old textbooks for extra cash",
      "Find rare and out-of-print course materials",
    ],
    faqs: [
      {
        question: "How do I sell my textbooks on Gimme Dat?",
        answer:
          "Create a free account with your .edu email, then post your textbook listing with photos, condition, and price. Students can contact you directly through our messaging system.",
      },
      {
        question: "How much can I save buying used textbooks?",
        answer:
          "Students typically save 50-70% compared to bookstore prices. Prices vary based on condition and demand, but peer-to-peer sales always beat retail.",
      },
      {
        question: "Is it safe to buy textbooks from other students?",
        answer:
          "All users are verified with .edu emails. We recommend meeting in public campus locations and inspecting books before purchasing.",
      },
      {
        question: "What textbook subjects are most popular?",
        answer:
          "Economics, Biology, Chemistry, and History textbooks are most frequently traded at Gettysburg College. Core curriculum books have the highest demand.",
      },
    ],
    ctaText: "Browse Textbooks",
    ctaLink: "/feed?type=item&category=textbooks",
    feedFilter: {
      type: "item",
      category: "textbooks",
    },
  },

  tutoring: {
    slug: SERVICE_CATEGORIES.tutoring.slug,
    title: "Tutoring Services at Gettysburg College",
    heroTitle: "Find Student Tutors at Gettysburg College",
    heroSubtitle: "Get help from top-performing students in your courses",
    description:
      "Connect with experienced student tutors at Gettysburg College. Find affordable tutoring for any subject from verified students who excel in their fields.",
    keywords: [...SERVICE_CATEGORIES.tutoring.keywords],
    benefits: [
      "Learn from students who recently took your courses",
      "Flexible scheduling around your class times",
      "Affordable rates set by student tutors",
      "In-person or remote tutoring options",
      "Subject-specific expertise from top students",
    ],
    faqs: [
      {
        question: "How do I find a tutor for my subject?",
        answer:
          "Browse our tutoring listings or search for your specific subject. Each tutor profile shows their expertise, availability, and rates.",
      },
      {
        question: "What subjects have the most tutors available?",
        answer:
          "Math, Chemistry, Biology, Economics, and Foreign Languages are popular tutoring subjects at Gettysburg. Upper-level students often tutor in their majors.",
      },
      {
        question: "How much does tutoring typically cost?",
        answer:
          "Student tutors at Gettysburg typically charge $15-25 per hour, significantly less than professional tutoring services.",
      },
      {
        question: "Can I become a tutor on Gimme Dat?",
        answer:
          "Yes! If you excel in a subject, you can offer tutoring services. Create a listing describing your expertise, rates, and availability.",
      },
    ],
    ctaText: "Find a Tutor",
    ctaLink: "/feed?type=service&category=tutoring",
    feedFilter: {
      type: "service",
      category: "tutoring",
    },
  },

  electronics: {
    slug: SERVICE_CATEGORIES.electronics.slug,
    title: "Used Electronics for Sale - Gettysburg",
    heroTitle: "Buy & Sell Electronics at Gettysburg College",
    heroSubtitle: "Quality used electronics from campus community members",
    description:
      "Find great deals on laptops, tablets, monitors, and more from Gettysburg College students. Buy and sell used electronics safely within your campus community.",
    keywords: [...SERVICE_CATEGORIES.electronics.keywords],
    benefits: [
      "Verified sellers from the Gettysburg community",
      "Test electronics before buying on campus",
      "Better prices than refurbished retailers",
      "Sell your old tech when upgrading",
      "Local pickup - no shipping hassles",
    ],
    faqs: [
      {
        question: "What electronics are commonly sold?",
        answer:
          "Laptops, monitors, headphones, tablets, gaming equipment, and phone accessories are popular. Students often sell when upgrading or graduating.",
      },
      {
        question: "How can I verify the condition of electronics?",
        answer:
          "Always meet in person to test items before purchase. Ask to see the device powered on and check all functions work properly.",
      },
      {
        question: "Are electronics covered by any warranty?",
        answer:
          "Peer-to-peer sales don't include warranties, but some items may still have manufacturer warranty. Ask the seller about any remaining coverage.",
      },
    ],
    ctaText: "Browse Electronics",
    ctaLink: "/feed?type=item&category=electronics",
    feedFilter: {
      type: "item",
      category: "electronics",
    },
  },

  furniture: {
    slug: SERVICE_CATEGORIES.furniture.slug,
    title: "Dorm Furniture - Gettysburg College",
    heroTitle: "Dorm & Apartment Furniture for Gettysburg Students",
    heroSubtitle:
      "Affordable furniture from students who have been there",
    description:
      "Find affordable dorm furniture, apartment essentials, and home decor from Gettysburg students. Perfect for move-in season or upgrading your space.",
    keywords: [...SERVICE_CATEGORIES.furniture.keywords],
    benefits: [
      "Furniture that fits dorm room dimensions",
      "Affordable prices from fellow students",
      "Great finds during graduation season",
      "Easy campus pickup and delivery",
      "Sustainable choice - reduce waste",
    ],
    faqs: [
      {
        question: "When is the best time to find furniture?",
        answer:
          "May graduation season and August move-out periods have the most furniture listings as students clear out their spaces.",
      },
      {
        question: "Can sellers help with delivery?",
        answer:
          "Many sellers offer local delivery for an additional fee, or you can arrange pickup. Message sellers to discuss options.",
      },
      {
        question: "What furniture items are most available?",
        answer:
          "Desks, chairs, mini-fridges, futons, shelving, and lamps are commonly sold. Check listings regularly as good items go quickly.",
      },
    ],
    ctaText: "Browse Furniture",
    ctaLink: "/feed?type=item&category=furniture",
    feedFilter: {
      type: "item",
      category: "furniture",
    },
  },

  transportation: {
    slug: SERVICE_CATEGORIES.transportation.slug,
    title: "Ride Share - Gettysburg College",
    heroTitle: "Ride Sharing for Gettysburg College Students",
    heroSubtitle: "Find rides to airports, cities, and beyond",
    description:
      "Connect with Gettysburg students for ride sharing to airports, nearby cities, and home during breaks. Share costs and make the journey more enjoyable.",
    keywords: [...SERVICE_CATEGORIES.transportation.keywords],
    benefits: [
      "Share costs with fellow students",
      "Rides to Philadelphia, Baltimore, DC airports",
      "Holiday and break travel options",
      "Verified Gettysburg student drivers",
      "Flexible scheduling",
    ],
    faqs: [
      {
        question: "Where do most ride shares go?",
        answer:
          "Popular destinations include Philadelphia (PHL), Baltimore (BWI), and DC (DCA/IAD) airports, as well as major cities for break travel.",
      },
      {
        question: "How is cost typically split?",
        answer:
          "Most drivers split gas costs evenly among passengers. Discuss specifics with the driver when arranging the ride.",
      },
      {
        question: "Is ride sharing safe?",
        answer:
          "All users are verified Gettysburg students. We recommend meeting drivers beforehand and sharing trip details with friends.",
      },
    ],
    ctaText: "Find Rides",
    ctaLink: "/feed?type=service&category=transportation",
    feedFilter: {
      type: "service",
      category: "transportation",
    },
  },

  photography: {
    slug: SERVICE_CATEGORIES.photography.slug,
    title: "Photography Services - Gettysburg",
    heroTitle: "Student Photographers at Gettysburg College",
    heroSubtitle: "Capture your college memories with talented student photographers",
    description:
      "Find talented student photographers at Gettysburg College for portraits, events, graduation photos, and more. Affordable rates and creative perspectives.",
    keywords: [...SERVICE_CATEGORIES.photography.keywords],
    benefits: [
      "Affordable rates from student photographers",
      "Unique creative perspectives",
      "Familiar with campus photo spots",
      "Portrait, event, and graduation photography",
      "Quick turnaround times",
    ],
    faqs: [
      {
        question: "What types of photography are available?",
        answer:
          "Student photographers offer portraits, graduation photos, event coverage, headshots, and creative photoshoots. Some specialize in specific styles.",
      },
      {
        question: "How much do student photographers charge?",
        answer:
          "Rates vary by photographer and session type, typically $50-150 for portrait sessions. Event coverage may be priced hourly.",
      },
      {
        question: "How do I see a photographer's work?",
        answer:
          "Most photographers include portfolio samples in their listings. You can also message them to request additional examples.",
      },
    ],
    ctaText: "Find Photographers",
    ctaLink: "/feed?type=service&category=photography",
    feedFilter: {
      type: "service",
      category: "photography",
    },
  },

  housing: {
    slug: SERVICE_CATEGORIES.housing.slug,
    title: "Student Housing - Gettysburg Area",
    heroTitle: "Housing & Roommates Near Gettysburg College",
    heroSubtitle: "Find off-campus housing and compatible roommates",
    description:
      "Connect with Gettysburg students looking for housing, roommates, and sublets. Find off-campus living situations near Gettysburg College.",
    keywords: [...SERVICE_CATEGORIES.housing.keywords],
    benefits: [
      "Find roommates from the Gettysburg community",
      "Sublet opportunities for breaks",
      "Off-campus housing listings",
      "Verified student community",
      "Local area knowledge",
    ],
    faqs: [
      {
        question: "What housing options are available?",
        answer:
          "Students post room shares, apartment sublets, and roommate searches. Most are in the immediate Gettysburg area.",
      },
      {
        question: "When do most housing posts appear?",
        answer:
          "Spring semester sees the most activity as students plan for the next year. Summer sublets are posted in April-May.",
      },
      {
        question: "How do I find a compatible roommate?",
        answer:
          "Listings often include lifestyle preferences. Message potential roommates to discuss living habits and expectations.",
      },
    ],
    ctaText: "Browse Housing",
    ctaLink: "/feed?type=service&category=housing",
    feedFilter: {
      type: "service",
      category: "housing",
    },
  },

  "other-services": {
    slug: SERVICE_CATEGORIES.other.slug,
    title: "Student Services - Gettysburg College",
    heroTitle: "Student Services at Gettysburg College",
    heroSubtitle: "Discover unique services from your campus community",
    description:
      "Browse a variety of student services at Gettysburg College including tech help, music lessons, moving assistance, and more.",
    keywords: [...SERVICE_CATEGORIES.other.keywords],
    benefits: [
      "Wide variety of student talents",
      "Affordable peer-to-peer services",
      "Support fellow students",
      "Convenient campus-based services",
      "Verified community members",
    ],
    faqs: [
      {
        question: "What kinds of services can I find?",
        answer:
          "Students offer tech support, music lessons, moving help, language practice, editing services, fitness training, and much more.",
      },
      {
        question: "Can I offer my own services?",
        answer:
          "Yes! Create a service listing describing your skills, rates, and availability. Help your campus community while earning money.",
      },
    ],
    ctaText: "Browse Services",
    ctaLink: "/feed?type=service",
    feedFilter: {
      type: "service",
    },
  },
};

// Location-based landing page content
export const LOCATION_LANDING_CONTENT: Record<string, LocationLandingContent> = {
  gettysburg: {
    slug: LOCAL_AREAS.gettysburg.slug,
    name: LOCAL_AREAS.gettysburg.name,
    state: LOCAL_AREAS.gettysburg.state,
    fullName: LOCAL_AREAS.gettysburg.fullName,
    heroTitle: "Campus Marketplace in Gettysburg, PA",
    heroSubtitle:
      "The trusted marketplace for Gettysburg College students and community",
    description:
      "Gimme Dat serves the Gettysburg College community in Gettysburg, Pennsylvania. Buy, sell, and trade textbooks, services, and more with verified students in Adams County.",
    keywords: [
      "Gettysburg College marketplace",
      "student marketplace Gettysburg PA",
      "buy sell Gettysburg",
      "college marketplace Adams County",
      "Gettysburg student services",
    ],
    localFeatures: [
      "Verified Gettysburg College students",
      "Campus-based exchanges",
      "Local Adams County community",
      "Historic Gettysburg location",
    ],
    landmarks: LOCAL_AREAS.gettysburg.landmarks
      ? [...LOCAL_AREAS.gettysburg.landmarks]
      : [
          "Gettysburg College",
          "Gettysburg National Military Park",
          "Downtown Gettysburg",
        ],
    faqs: [
      {
        question: "Who can use Gimme Dat in Gettysburg?",
        answer:
          "Gimme Dat is primarily for Gettysburg College students with verified .edu email addresses. This ensures a safe, trusted campus community.",
      },
      {
        question: "Where should I meet to exchange items?",
        answer:
          "We recommend public campus locations like the CUB, library, or student center. Downtown Gettysburg businesses are also good options.",
      },
      {
        question: "Is Gimme Dat only for Gettysburg College?",
        answer:
          "Currently, Gimme Dat focuses on the Gettysburg College community. We may expand to other campuses in the future.",
      },
    ],
    ctaText: "Browse Gettysburg Listings",
  },

  "adams-county": {
    slug: LOCAL_AREAS.adamsCounty.slug,
    name: LOCAL_AREAS.adamsCounty.name,
    state: LOCAL_AREAS.adamsCounty.state,
    fullName: LOCAL_AREAS.adamsCounty.fullName,
    heroTitle: "Student Marketplace in Adams County, PA",
    heroSubtitle: "Connecting students across Adams County",
    description:
      "Gimme Dat serves students in Adams County, Pennsylvania, centered on Gettysburg College. Find local student services, items for sale, and community connections.",
    keywords: [
      "Adams County student marketplace",
      "college marketplace PA",
      "student services Adams County",
      "Gettysburg area marketplace",
    ],
    localFeatures: [
      "Adams County student community",
      "Local Pennsylvania services",
      "Campus and off-campus options",
      "Regional student network",
    ],
    landmarks: ["Gettysburg College", "Gettysburg Battlefield", "Hanover"],
    faqs: [
      {
        question: "Does Gimme Dat serve all of Adams County?",
        answer:
          "Gimme Dat is centered on Gettysburg College but welcomes the broader Adams County student community. Listings may include off-campus services.",
      },
      {
        question: "Can I find services outside Gettysburg?",
        answer:
          "Some listings may serve the broader Adams County area. Check individual listings for service areas and availability.",
      },
    ],
    ctaText: "Browse Adams County Listings",
  },
};

// Helper function to get service landing content
export function getServiceLandingContent(
  slug: string
): ServiceLandingContent | undefined {
  return SERVICE_LANDING_CONTENT[slug];
}

// Helper function to get location landing content
export function getLocationLandingContent(
  slug: string
): LocationLandingContent | undefined {
  return LOCATION_LANDING_CONTENT[slug];
}

// Get all service slugs for static generation
export function getAllServiceSlugs(): string[] {
  return Object.keys(SERVICE_LANDING_CONTENT);
}

// Get all location slugs for static generation
export function getAllLocationSlugs(): string[] {
  return Object.keys(LOCATION_LANDING_CONTENT);
}
