// Centralized SEO Configuration for Gimme Dat - Campus Marketplace
// High-intent keyword matrix for Gettysburg College and surrounding area

export const SEO_CONFIG = {
  siteName: "Gimme Dat",
  siteUrl: "https://www.gimme-dat.com",
  defaultTitle: "Gimme Dat - Campus Marketplace",
  defaultDescription:
    "Your campus marketplace for services, items, and community connections. Buy, sell, and trade with fellow students at Gettysburg College.",
  locale: "en_US",
  twitterHandle: "@GimmeDatApp",
} as const;

// High-intent keyword matrix organized by priority and intent type
export const KEYWORDS = {
  // P0 - Core transactional keywords
  core: [
    "Gettysburg College textbooks for sale",
    "sell textbooks Gettysburg PA",
    "Gettysburg College tutoring services",
    "campus marketplace Gettysburg",
    "Gettysburg College marketplace",
    "Gettysburg student marketplace",
  ],
  // P1 - High-value local keywords
  local: [
    "student services near Gettysburg College",
    "buy used textbooks Pennsylvania",
    "college tutors Adams County PA",
    "dorm furniture Gettysburg",
    "Gettysburg PA student services",
    "Adams County college marketplace",
  ],
  // P2 - Service-specific keywords
  services: [
    "ride share Gettysburg College",
    "photography services Gettysburg",
    "tutoring Gettysburg College",
    "tech help Gettysburg PA",
    "music lessons Gettysburg",
    "moving services Adams County",
  ],
  // Long-tail keywords for content optimization
  longTail: [
    "best place to sell textbooks at Gettysburg College",
    "affordable tutoring for Gettysburg College students",
    "cheap dorm essentials Gettysburg PA",
    "student moving services Adams County",
    "used electronics Gettysburg College",
    "student furniture deals Pennsylvania",
  ],
} as const;

// All keywords flattened for metadata
export const ALL_KEYWORDS = [
  ...KEYWORDS.core,
  ...KEYWORDS.local,
  ...KEYWORDS.services,
  ...KEYWORDS.longTail,
] as const;

// Service categories for landing pages
export const SERVICE_CATEGORIES = {
  textbooks: {
    slug: "textbooks",
    title: "Textbooks",
    description: "Buy and sell textbooks at Gettysburg College",
    keywords: [
      "Gettysburg College textbooks",
      "sell textbooks Gettysburg",
      "used textbooks PA",
      "college textbooks Adams County",
    ],
  },
  tutoring: {
    slug: "tutoring",
    title: "Tutoring Services",
    description: "Find student tutors at Gettysburg College",
    keywords: [
      "Gettysburg College tutoring",
      "tutors Adams County",
      "college tutoring PA",
      "student tutors Gettysburg",
    ],
  },
  electronics: {
    slug: "electronics",
    title: "Electronics",
    description: "Used electronics for sale at Gettysburg College",
    keywords: [
      "used electronics Gettysburg",
      "student electronics PA",
      "college electronics deals",
    ],
  },
  furniture: {
    slug: "furniture",
    title: "Dorm Furniture",
    description: "Dorm and apartment furniture for Gettysburg students",
    keywords: [
      "dorm furniture Gettysburg",
      "college furniture PA",
      "student furniture Adams County",
    ],
  },
  transportation: {
    slug: "transportation",
    title: "Ride Share & Transportation",
    description: "Ride sharing and transportation for Gettysburg students",
    keywords: [
      "ride share Gettysburg College",
      "student transportation PA",
      "campus rides Adams County",
    ],
  },
  photography: {
    slug: "photography",
    title: "Photography Services",
    description: "Student photographers at Gettysburg College",
    keywords: [
      "photography services Gettysburg",
      "student photographers PA",
      "event photography Adams County",
    ],
  },
  housing: {
    slug: "housing",
    title: "Housing & Roommates",
    description: "Student housing and roommate services near Gettysburg",
    keywords: [
      "student housing Gettysburg",
      "roommates Gettysburg College",
      "off-campus housing PA",
    ],
  },
  other: {
    slug: "other-services",
    title: "Other Services",
    description: "Various student services at Gettysburg College",
    keywords: [
      "student services Gettysburg",
      "college services PA",
      "campus services Adams County",
    ],
  },
} as const;

// Local SEO - Cities and regions for geo-targeting
export const LOCAL_AREAS = {
  gettysburg: {
    slug: "gettysburg",
    name: "Gettysburg",
    state: "PA",
    fullName: "Gettysburg, Pennsylvania",
    county: "Adams County",
    description:
      "Campus marketplace serving Gettysburg College students and the Gettysburg, PA community.",
    landmarks: [
      "Gettysburg College",
      "Gettysburg National Military Park",
      "Downtown Gettysburg",
    ],
  },
  adamsCounty: {
    slug: "adams-county",
    name: "Adams County",
    state: "PA",
    fullName: "Adams County, Pennsylvania",
    description:
      "Student marketplace serving colleges and communities across Adams County, PA.",
  },
} as const;

// Schema.org types for structured data
export const SCHEMA_TYPES = {
  organization: "Organization",
  webSite: "WebSite",
  product: "Product",
  service: "Service",
  offer: "Offer",
  person: "Person",
  localBusiness: "LocalBusiness",
  itemList: "ItemList",
} as const;

// Seasonal content themes for dynamic SEO
export const SEASONAL_THEMES = {
  backToSchool: {
    period: "August-September",
    keywords: [
      "back to school Gettysburg",
      "fall semester essentials",
      "new student supplies",
    ],
    description: "Back-to-school deals and essentials for the fall semester",
  },
  graduation: {
    period: "May-June",
    keywords: [
      "graduation sale Gettysburg",
      "moving out sale college",
      "senior selling items",
    ],
    description: "Graduation season deals from graduating students",
  },
  winterBreak: {
    period: "December-January",
    keywords: [
      "winter break deals college",
      "semester end sale",
      "textbook buyback Gettysburg",
    ],
    description: "End of semester deals and textbook sales",
  },
  springBreak: {
    period: "March",
    keywords: [
      "spring break Gettysburg",
      "mid-semester deals",
      "student travel services",
    ],
    description: "Spring break services and mid-semester offerings",
  },
} as const;

// Page-specific metadata templates
export const PAGE_METADATA = {
  home: {
    title: "Gimme Dat - Gettysburg College Campus Marketplace",
    description:
      "Buy, sell, and trade textbooks, services, and more with verified Gettysburg College students. Your trusted campus marketplace.",
    keywords: [...KEYWORDS.core, ...KEYWORDS.local].slice(0, 10),
  },
  feed: {
    title: "Browse Marketplace - Gimme Dat",
    description:
      "Browse items and services from Gettysburg College students. Find textbooks, tutoring, electronics, and more.",
    keywords: [
      ...KEYWORDS.core,
      "browse campus listings",
      "student marketplace search",
    ],
  },
  services: {
    title: "Student Services - Gimme Dat",
    description:
      "Find tutoring, photography, tech help, and other services from Gettysburg College students.",
    keywords: KEYWORDS.services,
  },
  items: {
    title: "Items for Sale - Gimme Dat",
    description:
      "Shop textbooks, electronics, furniture, and more from Gettysburg College students.",
    keywords: [
      "items for sale Gettysburg",
      "student marketplace items",
      "college deals PA",
    ],
  },
} as const;
