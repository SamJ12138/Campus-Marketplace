// Local SEO data for geo-targeted content
// Focused on Gettysburg, PA and Adams County region

export interface LocalBusinessInfo {
  name: string;
  description: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo: {
    latitude: number;
    longitude: number;
  };
  areaServed: string[];
  serviceRadius: number; // in kilometers
}

export interface LocalKeywords {
  primary: string[];
  secondary: string[];
  longTail: string[];
}

// Gimme Dat local business information for structured data
export const LOCAL_BUSINESS_INFO: LocalBusinessInfo = {
  name: "Gimme Dat - Gettysburg Campus Marketplace",
  description:
    "Student marketplace serving Gettysburg College and Adams County, PA. Buy, sell, and trade textbooks, services, and more with verified students.",
  address: {
    addressLocality: "Gettysburg",
    addressRegion: "PA",
    postalCode: "17325",
    addressCountry: "US",
  },
  geo: {
    latitude: 39.8309,
    longitude: -77.2311,
  },
  areaServed: [
    "Gettysburg",
    "Adams County",
    "Biglerville",
    "Littlestown",
    "New Oxford",
    "Hanover",
  ],
  serviceRadius: 50, // 50km radius
};

// Gettysburg-specific keywords for local SEO
export const GETTYSBURG_KEYWORDS: LocalKeywords = {
  primary: [
    "Gettysburg College marketplace",
    "Gettysburg student marketplace",
    "campus marketplace Gettysburg PA",
    "buy sell Gettysburg College",
    "student services Gettysburg",
  ],
  secondary: [
    "Gettysburg PA textbooks",
    "tutoring Gettysburg College",
    "dorm furniture Gettysburg",
    "student jobs Gettysburg",
    "college services Adams County",
  ],
  longTail: [
    "best place to sell textbooks Gettysburg College",
    "affordable tutoring near Gettysburg College",
    "cheap dorm furniture Gettysburg PA",
    "student ride share Gettysburg to Philadelphia",
    "photography services Gettysburg College students",
  ],
};

// Local landmarks and points of interest for content
export const GETTYSBURG_LANDMARKS = {
  campus: [
    "Gettysburg College",
    "Musselman Library",
    "College Union Building (CUB)",
    "Gettysburg College Science Center",
    "Majestic Theater",
  ],
  downtown: [
    "Lincoln Square",
    "Downtown Gettysburg",
    "Gettysburg Visitor Center",
    "Lincoln Diner",
  ],
  historical: [
    "Gettysburg National Military Park",
    "Gettysburg Battlefield",
    "Gettysburg Address Memorial",
    "Soldiers' National Cemetery",
  ],
  nearby: [
    "Adams County",
    "Hanover",
    "Carlisle",
    "York",
    "Harrisburg",
  ],
};

// Seasonal events for content marketing
export const GETTYSBURG_EVENTS = {
  academic: [
    { name: "Fall Semester Start", month: "August", keywords: ["back to school", "fall semester"] },
    { name: "Family Weekend", month: "October", keywords: ["family weekend", "campus visit"] },
    { name: "Finals Week", month: "December", keywords: ["finals", "textbook buyback"] },
    { name: "Spring Break", month: "March", keywords: ["spring break", "ride share"] },
    { name: "Graduation", month: "May", keywords: ["graduation", "moving out", "furniture sale"] },
  ],
  local: [
    { name: "Gettysburg Anniversary", month: "July", keywords: ["Gettysburg events", "summer"] },
    { name: "Apple Harvest Festival", month: "October", keywords: ["fall festival", "Adams County"] },
  ],
};

// NAP consistency data (Name, Address, Phone)
export const NAP_DATA = {
  name: "Gimme Dat",
  alternateName: "Gimme Dat Campus Marketplace",
  url: "https://www.gimme-dat.com",
  // Note: Physical address not applicable for digital marketplace
  serviceArea: "Gettysburg College and Adams County, PA",
};

// Generate local business schema
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: LOCAL_BUSINESS_INFO.name,
    description: LOCAL_BUSINESS_INFO.description,
    url: NAP_DATA.url,
    address: {
      "@type": "PostalAddress",
      ...LOCAL_BUSINESS_INFO.address,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LOCAL_BUSINESS_INFO.geo.latitude,
      longitude: LOCAL_BUSINESS_INFO.geo.longitude,
    },
    areaServed: LOCAL_BUSINESS_INFO.areaServed.map((area) => ({
      "@type": "City",
      name: area,
    })),
    priceRange: "Free",
    openingHours: "24/7",
  };
}

// Get keywords for a specific category in local context
export function getLocalCategoryKeywords(category: string): string[] {
  const categoryKeywords: Record<string, string[]> = {
    textbooks: [
      "Gettysburg College textbooks",
      "sell textbooks Gettysburg PA",
      "used textbooks Adams County",
      "buy textbooks Gettysburg College",
    ],
    tutoring: [
      "tutoring Gettysburg College",
      "tutors Adams County PA",
      "student tutors Gettysburg",
      "affordable tutoring Pennsylvania",
    ],
    electronics: [
      "used electronics Gettysburg",
      "student electronics PA",
      "laptops Gettysburg College",
      "electronics deals Adams County",
    ],
    furniture: [
      "dorm furniture Gettysburg",
      "student furniture PA",
      "college furniture Adams County",
      "apartment furniture Gettysburg",
    ],
    transportation: [
      "ride share Gettysburg College",
      "student transportation PA",
      "airport rides Gettysburg",
      "carpool Adams County",
    ],
    photography: [
      "photography Gettysburg",
      "student photographers PA",
      "graduation photos Gettysburg College",
      "event photography Adams County",
    ],
    housing: [
      "student housing Gettysburg",
      "roommates Gettysburg College",
      "off-campus housing PA",
      "sublets Adams County",
    ],
  };

  return categoryKeywords[category] || GETTYSBURG_KEYWORDS.primary;
}
