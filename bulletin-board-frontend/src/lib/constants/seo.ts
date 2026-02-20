// Centralized SEO Configuration for GimmeDat - Campus Marketplace

export const SEO_CONFIG = {
  siteName: "GimmeDat",
  siteUrl: "https://www.gimme-dat.com",
  defaultTitle: "GimmeDat - The Student Marketplace",
  defaultDescription:
    "The student marketplace for services, items, and campus connections. Buy, sell, and trade with verified college students.",
  locale: "en_US",
  twitterHandle: "@GimmeDatApp",
} as const;

// High-intent keyword matrix organized by priority and intent type
export const KEYWORDS = {
  // P0 - Core transactional keywords
  core: [
    "college textbooks for sale",
    "sell textbooks online students",
    "college tutoring services",
    "campus marketplace",
    "student marketplace",
    "buy sell college students",
  ],
  // P1 - High-value local keywords
  local: [
    "student services near me",
    "buy used textbooks college",
    "college tutors near me",
    "dorm furniture for sale",
    "student services on campus",
    "college marketplace app",
  ],
  // P2 - Service-specific keywords
  services: [
    "ride share college students",
    "student photography services",
    "college tutoring peer",
    "tech help campus",
    "music lessons college",
    "moving services students",
    "hair braiding on campus",
    "fitness training college",
  ],
  // Long-tail keywords for content optimization
  longTail: [
    "best place to sell textbooks in college",
    "affordable tutoring for college students",
    "cheap dorm essentials for students",
    "student moving services near campus",
    "used electronics college marketplace",
    "student furniture deals near me",
    "college clothing resale marketplace",
    "event tickets student discount",
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
    description: "Buy and sell textbooks with verified students",
    keywords: [
      "college textbooks for sale",
      "sell used textbooks",
      "cheap textbooks students",
      "campus textbook exchange",
    ],
  },
  tutoring: {
    slug: "tutoring",
    title: "Tutoring Services",
    description: "Find peer tutors on your campus",
    keywords: [
      "college tutoring services",
      "peer tutors campus",
      "student tutoring affordable",
      "online tutoring college",
    ],
  },
  electronics: {
    slug: "electronics",
    title: "Electronics",
    description: "Used electronics from fellow students",
    keywords: [
      "used electronics college",
      "student electronics for sale",
      "cheap laptops campus",
      "college tech deals",
    ],
  },
  furniture: {
    slug: "furniture",
    title: "Dorm Furniture",
    description: "Dorm and apartment furniture from students",
    keywords: [
      "dorm furniture for sale",
      "college apartment furniture",
      "student furniture deals",
      "cheap dorm essentials",
    ],
  },
  clothing: {
    slug: "clothing",
    title: "Clothing & Accessories",
    description: "Thrift and resell clothing on campus",
    keywords: [
      "college clothing resale",
      "student thrift marketplace",
      "campus fashion deals",
      "secondhand clothing college",
    ],
  },
  tickets: {
    slug: "tickets",
    title: "Tickets & Events",
    description: "Buy and sell event tickets on campus",
    keywords: [
      "college event tickets",
      "student concert tickets",
      "campus event tickets for sale",
      "game day tickets college",
    ],
  },
  "hair-beauty": {
    slug: "hair-beauty",
    title: "Hair & Beauty",
    description: "Hair styling, braiding, nails, and beauty services on campus",
    keywords: [
      "hair braiding college campus",
      "student beauty services",
      "campus hairstylist affordable",
      "nails lashes college",
    ],
  },
  "music-lessons": {
    slug: "music-lessons",
    title: "Music Lessons",
    description: "Learn an instrument from talented student musicians",
    keywords: [
      "music lessons college students",
      "guitar lessons campus",
      "piano lessons affordable",
      "student music tutoring",
    ],
  },
  fitness: {
    slug: "fitness",
    title: "Fitness Training",
    description: "Personal training and fitness services from students",
    keywords: [
      "personal training college",
      "student fitness coach",
      "campus workout partner",
      "affordable personal trainer",
    ],
  },
  "tech-help": {
    slug: "tech-help",
    title: "Tech Help",
    description: "Computer repair, setup, and tech support from students",
    keywords: [
      "tech help college campus",
      "student computer repair",
      "laptop fix near me",
      "campus IT help affordable",
    ],
  },
  transportation: {
    slug: "transportation",
    title: "Ride Share & Transportation",
    description: "Ride sharing and transportation between students",
    keywords: [
      "ride share college students",
      "student transportation",
      "campus rides airport",
      "carpool college break",
    ],
  },
  photography: {
    slug: "photography",
    title: "Photography Services",
    description: "Student photographers for portraits, events, and graduation",
    keywords: [
      "student photography services",
      "graduation photos affordable",
      "campus event photographer",
      "portrait photography college",
    ],
  },
  housing: {
    slug: "housing",
    title: "Housing & Roommates",
    description: "Find off-campus housing and roommates",
    keywords: [
      "student housing near campus",
      "college roommate finder",
      "off-campus housing",
      "sublet college apartment",
    ],
  },
  other: {
    slug: "other-services",
    title: "Other Services",
    description: "All kinds of student services and skills",
    keywords: [
      "student services campus",
      "college odd jobs",
      "peer services marketplace",
      "campus gig economy",
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
      "back to school college",
      "fall semester essentials",
      "new student supplies",
    ],
    description: "Back-to-school deals and essentials for the fall semester",
  },
  graduation: {
    period: "May-June",
    keywords: [
      "graduation sale college",
      "moving out sale campus",
      "senior selling items",
    ],
    description: "Graduation season deals from graduating students",
  },
  winterBreak: {
    period: "December-January",
    keywords: [
      "winter break deals college",
      "semester end sale",
      "textbook buyback campus",
    ],
    description: "End of semester deals and textbook sales",
  },
  springBreak: {
    period: "March",
    keywords: [
      "spring break college",
      "mid-semester deals",
      "student travel services",
    ],
    description: "Spring break services and mid-semester offerings",
  },
} as const;

// Page-specific metadata templates
export const PAGE_METADATA = {
  home: {
    title: "GimmeDat - The Student Marketplace",
    description:
      "Buy, sell, and trade textbooks, services, and more with verified college students. Your trusted campus marketplace.",
    keywords: [...KEYWORDS.core, ...KEYWORDS.local].slice(0, 10),
  },
  feed: {
    title: "Browse Marketplace - GimmeDat",
    description:
      "Browse items and services from verified students. Find textbooks, tutoring, electronics, and more.",
    keywords: [
      ...KEYWORDS.core,
      "browse campus listings",
      "student marketplace search",
    ],
  },
  services: {
    title: "Student Services - GimmeDat",
    description:
      "Find tutoring, photography, tech help, beauty services, and more from verified students on your campus.",
    keywords: KEYWORDS.services,
  },
  items: {
    title: "Items for Sale - GimmeDat",
    description:
      "Shop textbooks, electronics, furniture, clothing, tickets, and more from fellow students.",
    keywords: [
      "items for sale college",
      "student marketplace items",
      "campus deals near me",
    ],
  },
} as const;
