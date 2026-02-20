// Landing page content configuration for SEO landing pages
// Generic campus marketplace content for GimmeDat

import { SERVICE_CATEGORIES, LOCAL_AREAS } from "@/lib/constants/seo";

export interface ServiceLandingContent {
  slug: string;
  title: string;
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  keywords: string[];
  benefits: string[];
  examplePosts: Array<{
    title: string;
    price: string;
    snippet: string;
  }>;
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
    title: "College Textbooks for Sale",
    heroTitle: "Buy and Sell Textbooks on Campus",
    heroSubtitle:
      "Save up to 70% on textbooks from verified students at your school",
    description:
      "Find affordable used textbooks from fellow students. Buy and sell course materials, study guides, and academic resources within your campus community.",
    keywords: [...SERVICE_CATEGORIES.textbooks.keywords],
    benefits: [
      "Save up to 70% compared to bookstore prices",
      "Buy from verified students at your school",
      "Quick campus meetups for exchanges",
      "Sell your old textbooks for extra cash",
      "Find rare and out-of-print course materials",
      "No shipping fees when you meet on campus",
    ],
    examplePosts: [
      {
        title: "Organic Chemistry (Wade) 9th Edition",
        price: "$45",
        snippet:
          "Lightly highlighted, all pages intact. Used for one semester of Orgo I. Can meet at the library.",
      },
      {
        title: "Intro to Microeconomics - Mankiw",
        price: "$30",
        snippet:
          "Clean copy, no writing inside. Includes the online access code (unused). Perfect for Econ 101.",
      },
      {
        title: "Calculus: Early Transcendentals (Stewart)",
        price: "$50",
        snippet:
          "8th edition hardcover. Some pencil notes in margins, easily erasable. Covers Calc I through III.",
      },
      {
        title: "Bundle: 5 Intro Psychology Textbooks",
        price: "$80",
        snippet:
          "Selling my entire Psych major starter pack. Includes DSM-5, Abnormal Psych, Research Methods, Stats, and Social Psych.",
      },
    ],
    faqs: [
      {
        question: "How do I sell my textbooks on GimmeDat?",
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
          "All users are verified with .edu emails. We recommend meeting in public campus locations like the library or student center and inspecting books before purchasing.",
      },
      {
        question: "What if the edition I need is not listed?",
        answer:
          "Post a 'wanted' request describing the book, edition, and your budget. Many students check the feed before listing their own books and might reach out.",
      },
      {
        question: "When is the best time to buy or sell textbooks?",
        answer:
          "The first two weeks of each semester see the most activity. Selling at the end of the semester is also popular, especially before finals when next-semester students start shopping early.",
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
    title: "Peer Tutoring Services",
    heroTitle: "Find Student Tutors on Your Campus",
    heroSubtitle: "Get help from top-performing students who aced your courses",
    description:
      "Connect with experienced student tutors at your school. Find affordable tutoring for any subject from verified students who excel in their fields.",
    keywords: [...SERVICE_CATEGORIES.tutoring.keywords],
    benefits: [
      "Learn from students who recently took your courses",
      "Flexible scheduling around your class times",
      "Affordable rates set by student tutors ($12-30/hr)",
      "In-person or remote tutoring options",
      "Subject-specific expertise from top students",
      "Study tips and exam strategies from peers who succeeded",
    ],
    examplePosts: [
      {
        title: "Organic Chemistry Tutor - Aced Orgo I & II",
        price: "$25/hr",
        snippet:
          "Biochem major, got A's in both semesters of Orgo. I break down mechanisms in a way that actually makes sense. Can meet at the library or do Zoom sessions.",
      },
      {
        title: "Spanish Conversation Practice",
        price: "$15/hr",
        snippet:
          "Native speaker and Spanish minor. I help with conversation, grammar, and essay writing. All levels welcome, from Intro to Advanced Lit.",
      },
      {
        title: "Stats & Data Analysis Help (R, SPSS, Excel)",
        price: "$20/hr",
        snippet:
          "Math major who also TAs for Intro Stats. Can help with homework, projects, or exam prep. Comfortable with R, SPSS, and Excel.",
      },
      {
        title: "Physics I & II Tutoring",
        price: "$22/hr",
        snippet:
          "Engineering major, scored 5 on AP Physics and got A's in university Physics. Specializing in mechanics and E&M problem solving.",
      },
      {
        title: "Essay Writing & Thesis Coach",
        price: "$18/hr",
        snippet:
          "English major and writing center tutor. I help with brainstorming, outlining, drafts, and final polishing for any class. MLA, APA, Chicago formats.",
      },
    ],
    faqs: [
      {
        question: "How do I find a tutor for my subject?",
        answer:
          "Browse our tutoring listings or search for your specific subject. Each tutor profile shows their expertise, availability, and rates.",
      },
      {
        question: "How much does tutoring typically cost?",
        answer:
          "Student tutors typically charge $12-30 per hour depending on the subject and their experience. Group sessions are often cheaper per person.",
      },
      {
        question: "Can I become a tutor on GimmeDat?",
        answer:
          "Yes! If you excel in a subject, create a service listing describing your expertise, rates, and availability. Many students earn $200-500/month tutoring peers.",
      },
      {
        question: "Is online tutoring available?",
        answer:
          "Many tutors offer Zoom or Google Meet sessions. Check individual listings for remote availability, or message the tutor to ask.",
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
    title: "Used Electronics for Sale",
    heroTitle: "Buy and Sell Electronics on Campus",
    heroSubtitle: "Quality used tech from verified students at great prices",
    description:
      "Find great deals on laptops, tablets, monitors, headphones, and more from fellow students. Buy and sell used electronics safely within your campus community.",
    keywords: [...SERVICE_CATEGORIES.electronics.keywords],
    benefits: [
      "Verified sellers from your campus community",
      "Test electronics before buying in person",
      "Better prices than refurbished retailers",
      "Sell your old tech when upgrading",
      "Local pickup, no shipping needed",
      "Gaming gear, studio equipment, and more",
    ],
    examplePosts: [
      {
        title: 'MacBook Air M2 13" - Like New',
        price: "$750",
        snippet:
          "Bought last fall, barely used. 256GB, 8GB RAM, Space Gray. Battery cycle count under 50. Includes original charger and box.",
      },
      {
        title: "Sony WH-1000XM5 Noise Cancelling Headphones",
        price: "$180",
        snippet:
          "Black, excellent condition. Best noise cancelling for studying in loud dorms. Includes carrying case and cable.",
      },
      {
        title: "Dell 27\" 1440p Monitor + Monitor Arm",
        price: "$200",
        snippet:
          "Great for dual-monitor setup or gaming. IPS panel, 75Hz. Selling because I'm graduating. Arm clamps to any desk.",
      },
      {
        title: "iPad Air 5th Gen + Apple Pencil 2",
        price: "$420",
        snippet:
          "64GB Wi-Fi, Starlight color. Perfect for note-taking with GoodNotes. Apple Pencil 2 included. Screen protector already applied.",
      },
      {
        title: "Mechanical Keyboard - Keychron K2 (Brown Switches)",
        price: "$55",
        snippet:
          "Wireless Bluetooth + USB-C. RGB backlit, compact 75% layout. Great for dorm desk. Switches are tactile and not too loud.",
      },
    ],
    faqs: [
      {
        question: "What electronics are commonly sold?",
        answer:
          "Laptops, monitors, headphones, tablets, gaming equipment, keyboards, cameras, and phone accessories are popular. Students often sell when upgrading or graduating.",
      },
      {
        question: "How can I verify the condition of electronics?",
        answer:
          "Always meet in person to test items before purchase. Ask to see the device powered on, check the battery health, and test all ports and functions.",
      },
      {
        question: "Are electronics covered by any warranty?",
        answer:
          "Peer-to-peer sales don't include warranties, but some items may still have manufacturer warranty. Always ask the seller about remaining coverage.",
      },
      {
        question: "What is a fair price for used electronics?",
        answer:
          "Check the retail price of the item new, then factor in age and condition. Most used electronics sell for 40-70% of the original price depending on wear.",
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
    title: "Dorm and Apartment Furniture",
    heroTitle: "Affordable Furniture from Fellow Students",
    heroSubtitle:
      "Dorm-friendly furniture at student-friendly prices",
    description:
      "Find affordable dorm furniture, apartment essentials, and home decor from students. Perfect for move-in season or upgrading your space without breaking the bank.",
    keywords: [...SERVICE_CATEGORIES.furniture.keywords],
    benefits: [
      "Furniture sized to fit dorm rooms and small apartments",
      "Affordable prices from fellow students",
      "Great finds during graduation season (May-June)",
      "Easy campus pickup, no delivery fees",
      "Sustainable choice that reduces waste",
      "Everything from futons to mini-fridges",
    ],
    examplePosts: [
      {
        title: "IKEA KALLAX Shelf Unit (White, 4x2)",
        price: "$35",
        snippet:
          "Perfect dorm storage. Fits books, bins, and vinyl. Assembled, but easy to take apart for transport. No scratches.",
      },
      {
        title: "Mini Fridge - Midea 3.1 Cu Ft",
        price: "$60",
        snippet:
          "Works perfectly, kept it in my dorm for 2 years. Has a small freezer compartment. Graduating and need it gone by May 15.",
      },
      {
        title: "Full-Size Futon (Dark Gray)",
        price: "$80",
        snippet:
          "Comfortable futon, converts to a bed for guests. Used in my off-campus apartment. Fabric is clean, frame is sturdy metal.",
      },
      {
        title: "LED Desk Lamp + Surge Protector Bundle",
        price: "$20",
        snippet:
          "Adjustable desk lamp with USB charging port plus a 6-outlet surge protector. Everything a dorm desk needs.",
      },
      {
        title: "Standing Desk Converter (Adjustable)",
        price: "$45",
        snippet:
          "Sits on top of any desk and raises your laptop to standing height. Saved my back during thesis writing. Adjusts from 6 to 16 inches.",
      },
    ],
    faqs: [
      {
        question: "When is the best time to find furniture?",
        answer:
          "May graduation season and August move-out periods have the most furniture listings as students clear out their spaces. Check frequently during these months.",
      },
      {
        question: "Can sellers help with delivery?",
        answer:
          "Many sellers offer local delivery for a small fee, or you can arrange pickup. Message sellers to discuss logistics.",
      },
      {
        question: "What furniture items are most available?",
        answer:
          "Desks, chairs, mini-fridges, futons, shelving, lamps, and storage bins are commonly sold. Good items go quickly, so check often.",
      },
      {
        question: "Will it fit in my dorm room?",
        answer:
          "Most student sellers know standard dorm room dimensions. Always ask for exact measurements and compare with your room before committing.",
      },
    ],
    ctaText: "Browse Furniture",
    ctaLink: "/feed?type=item&category=furniture",
    feedFilter: {
      type: "item",
      category: "furniture",
    },
  },

  clothing: {
    slug: SERVICE_CATEGORIES.clothing.slug,
    title: "Clothing and Accessories",
    heroTitle: "Thrift, Swap, and Sell Clothes on Campus",
    heroSubtitle:
      "Refresh your wardrobe sustainably from students with great taste",
    description:
      "Buy and sell clothing, shoes, and accessories with fellow students. From vintage finds to barely-worn brands, find your next outfit without leaving campus.",
    keywords: [...SERVICE_CATEGORIES.clothing.keywords],
    benefits: [
      "Designer and brand-name clothing at student prices",
      "Sustainable fashion that reduces waste",
      "Try before you buy with on-campus meetups",
      "Sell clothes you no longer wear for cash",
      "Find formal wear for events without full retail price",
      "Sneakers, jackets, accessories, and more",
    ],
    examplePosts: [
      {
        title: "Nike Dunk Low (Panda) - Size 10, Like New",
        price: "$75",
        snippet:
          "Worn maybe 5 times, no creasing. Comes with original box. Selling because I got a different colorway.",
      },
      {
        title: "North Face Puffer Jacket - Women's M",
        price: "$90",
        snippet:
          "Black 700-fill down jacket, super warm. Bought it last winter for $250. No rips, zippers all work perfectly.",
      },
      {
        title: "Formal Dress - Navy Blue, Size 6",
        price: "$40",
        snippet:
          "Wore once to a gala. Perfect for formals, banquets, or interviews. Dry cleaned and ready to go.",
      },
      {
        title: "Lot of 10 Graphic Tees (Men's L)",
        price: "$35",
        snippet:
          "Clearing out my closet. Mix of band tees, vintage, and streetwear. All in good condition. Will sell individually for $5 each.",
      },
      {
        title: "Suit Jacket + Dress Pants - Men's 40R",
        price: "$60",
        snippet:
          "Navy slim fit from J.Crew. Wore it to 3 interviews. Perfect for career fairs and presentations. Includes a matching tie.",
      },
    ],
    faqs: [
      {
        question: "How do I know if clothes will fit?",
        answer:
          "Sellers list sizes in their posts. For the best fit, ask the seller for measurements or arrange an on-campus meetup to try items on before buying.",
      },
      {
        question: "Are the clothes clean and in good condition?",
        answer:
          "Most sellers describe the condition honestly. Look for posts that mention how many times the item was worn and whether it has been laundered.",
      },
      {
        question: "Can I sell a bulk lot of clothes?",
        answer:
          "Absolutely. Bundle deals are popular and a great way to clear out your closet fast. List each item in the description with sizes and conditions.",
      },
      {
        question: "What sells best?",
        answer:
          "Sneakers, jackets, formal wear, and brand-name basics tend to sell fastest. Seasonal items do well right before the weather changes.",
      },
    ],
    ctaText: "Browse Clothing",
    ctaLink: "/feed?type=item&category=clothing",
    feedFilter: {
      type: "item",
      category: "clothing",
    },
  },

  tickets: {
    slug: SERVICE_CATEGORIES.tickets.slug,
    title: "Tickets and Events",
    heroTitle: "Buy and Sell Event Tickets on Campus",
    heroSubtitle:
      "Concerts, games, formals, and more from students who can't go",
    description:
      "Find tickets to campus events, concerts, sports games, and more from fellow students. Sell tickets you can't use instead of letting them go to waste.",
    keywords: [...SERVICE_CATEGORIES.tickets.keywords],
    benefits: [
      "Below face-value tickets from students who can't attend",
      "Campus event and formal tickets",
      "Concert and music festival passes",
      "Sports game tickets for sold-out events",
      "Safe transactions with verified students",
      "Last-minute deals close to event dates",
    ],
    examplePosts: [
      {
        title: "2 Tickets to Spring Formal - Saturday Night",
        price: "$25 each",
        snippet:
          "Can't make it anymore. Paid $30 each. Digital tickets, I'll transfer them to your student account.",
      },
      {
        title: "Concert Tickets - Dominic Fike (GA Floor)",
        price: "$65",
        snippet:
          "Show is next Friday at the arena downtown. I have an exam conflict. Selling at cost, no markup.",
      },
      {
        title: "Football Season Pass - Student Section",
        price: "$40",
        snippet:
          "Transferable student season pass, 4 home games remaining. I'm studying abroad next semester.",
      },
      {
        title: "Comedy Show Ticket - Campus Event Board",
        price: "$10",
        snippet:
          "This Saturday at 8pm in the auditorium. Bought it but realized I'm going home this weekend.",
      },
    ],
    faqs: [
      {
        question: "How do ticket transfers work?",
        answer:
          "It depends on the ticket type. Digital tickets can be transferred via the ticketing platform. Physical tickets can be handed off in person on campus.",
      },
      {
        question: "Are scalped or marked-up tickets allowed?",
        answer:
          "GimmeDat encourages fair pricing. Selling at or below face value keeps the marketplace trustworthy for everyone.",
      },
      {
        question: "What if the event gets cancelled?",
        answer:
          "Refund policies depend on the event organizer. We recommend keeping receipts and communicating with the seller about cancellation terms before purchasing.",
      },
    ],
    ctaText: "Browse Tickets",
    ctaLink: "/feed?type=item&category=tickets",
    feedFilter: {
      type: "item",
      category: "tickets",
    },
  },

  "hair-beauty": {
    slug: SERVICE_CATEGORIES["hair-beauty"].slug,
    title: "Hair and Beauty Services",
    heroTitle: "Campus Hair, Nails, and Beauty Services",
    heroSubtitle:
      "Talented student stylists at prices that won't break the bank",
    description:
      "Find affordable hair styling, braiding, nails, lashes, and beauty services from skilled students on your campus. Look your best without the salon price tag.",
    keywords: [...SERVICE_CATEGORIES["hair-beauty"].keywords],
    benefits: [
      "Affordable rates far below salon prices",
      "Convenient on-campus or dorm appointments",
      "Skilled students with portfolio photos to browse",
      "Braids, twists, locs, silk presses, and more",
      "Nails, lashes, and makeup for events",
      "Flexible scheduling around your classes",
    ],
    examplePosts: [
      {
        title: "Box Braids - All Lengths Available",
        price: "From $80",
        snippet:
          "I do knotless box braids, medium and small sizes. Hair included in price for lengths up to 30 inches. Takes about 4-6 hours. Check my IG for examples.",
      },
      {
        title: "Gel Nail Sets - Designs Available",
        price: "$30-45",
        snippet:
          "Full gel manicure in my dorm. I can do French tips, chrome, nail art, and custom designs. Lasts 2-3 weeks. Booking for this weekend.",
      },
      {
        title: "Silk Press & Trim",
        price: "$50",
        snippet:
          "Professional-quality silk press using heat protectant and flat iron. Trim included if needed. I have 3+ years of experience.",
      },
      {
        title: "Lash Extensions - Classic & Volume",
        price: "$55-75",
        snippet:
          "Certified lash tech offering classic and volume sets. Fills available for $35. I use quality adhesive and lash fans. Appointment takes about 90 min.",
      },
      {
        title: "Makeup for Formals and Events",
        price: "$40",
        snippet:
          "Full glam or natural look, your choice. I bring all my own products (high-end brands). Can do individual or group bookings for formals.",
      },
    ],
    faqs: [
      {
        question: "How do I see a stylist's work?",
        answer:
          "Most stylists include portfolio photos in their listings or link to their social media. You can also message them to request before-and-after examples.",
      },
      {
        question: "Where do appointments usually happen?",
        answer:
          "Most beauty services happen in the stylist's dorm or apartment. Some stylists can also come to you. Details are listed in each post.",
      },
      {
        question: "Do I need to bring my own hair or products?",
        answer:
          "It depends on the service. Most braiders include hair in the price. For other services, check the listing or ask the stylist what's included.",
      },
      {
        question: "How do I book an appointment?",
        answer:
          "Message the stylist through GimmeDat to discuss timing, style preferences, and payment. Most stylists book a few days in advance.",
      },
    ],
    ctaText: "Browse Hair & Beauty",
    ctaLink: "/feed?type=service&category=hair-beauty",
    feedFilter: {
      type: "service",
      category: "hair-beauty",
    },
  },

  "music-lessons": {
    slug: SERVICE_CATEGORIES["music-lessons"].slug,
    title: "Music Lessons on Campus",
    heroTitle: "Learn Music from Talented Student Musicians",
    heroSubtitle:
      "Guitar, piano, vocals, and more from students who love to teach",
    description:
      "Take affordable music lessons from talented student musicians on your campus. Learn guitar, piano, vocals, drums, and more with flexible scheduling.",
    keywords: [...SERVICE_CATEGORIES["music-lessons"].keywords],
    benefits: [
      "Affordable lessons from skilled student musicians",
      "Guitar, piano, voice, drums, and more",
      "Flexible scheduling around classes",
      "Beginner-friendly, no experience needed",
      "Learn songs you actually want to play",
      "In-person or virtual lesson options",
    ],
    examplePosts: [
      {
        title: "Guitar Lessons - Acoustic & Electric",
        price: "$20/hr",
        snippet:
          "Music minor, been playing for 10 years. I teach everything from basic chords to fingerpicking and music theory. Beginners welcome. I have a spare guitar you can borrow for lessons.",
      },
      {
        title: "Piano Lessons for Beginners",
        price: "$18/hr",
        snippet:
          "Classically trained pianist, 8 years of experience. I keep lessons fun with songs you actually want to learn. Practice rooms in the music building are free to use.",
      },
      {
        title: "Vocal Coaching - Pop, R&B, Musical Theater",
        price: "$25/hr",
        snippet:
          "Voice major with performance experience. I help with technique, range expansion, and audition prep. Great for a cappella group tryouts.",
      },
      {
        title: "Drum Lessons - Beginner to Intermediate",
        price: "$22/hr",
        snippet:
          "I play in two campus bands. Can teach rock, jazz, and hip-hop styles. We can use the practice room kits or I'll bring a practice pad.",
      },
    ],
    faqs: [
      {
        question: "Do I need my own instrument?",
        answer:
          "Not always! Many teachers have spare instruments or can meet in music practice rooms that have equipment. Check each listing for details.",
      },
      {
        question: "Are lessons for complete beginners?",
        answer:
          "Most student teachers welcome all skill levels, from total beginners to intermediate players looking to level up. Just mention your experience when reaching out.",
      },
      {
        question: "How often should I take lessons?",
        answer:
          "Once a week is standard for steady progress. Some students do biweekly. Your tutor can suggest a schedule based on your goals.",
      },
    ],
    ctaText: "Find Music Lessons",
    ctaLink: "/feed?type=service&category=music-lessons",
    feedFilter: {
      type: "service",
      category: "music-lessons",
    },
  },

  fitness: {
    slug: SERVICE_CATEGORIES.fitness.slug,
    title: "Fitness Training on Campus",
    heroTitle: "Student Personal Trainers and Fitness Coaches",
    heroSubtitle:
      "Get in shape with affordable training from certified student athletes",
    description:
      "Find personal trainers, workout partners, and fitness coaches from your campus community. Affordable rates, flexible scheduling, and training at your campus gym.",
    keywords: [...SERVICE_CATEGORIES.fitness.keywords],
    benefits: [
      "Affordable personal training from student athletes",
      "Train at your campus gym or outdoors",
      "Custom workout plans for your goals",
      "Flexible scheduling between classes",
      "Accountability and motivation from a peer",
      "Strength, cardio, flexibility, and nutrition guidance",
    ],
    examplePosts: [
      {
        title: "Personal Training - Strength & Conditioning",
        price: "$20/session",
        snippet:
          "Kinesiology major and certified personal trainer (NASM). I design custom programs for muscle gain, fat loss, or athletic performance. All sessions at the campus rec center.",
      },
      {
        title: "Running Coach - 5K to Half Marathon Prep",
        price: "$15/session",
        snippet:
          "Cross-country team member. I'll create a training plan, run with you, and help you hit your goal time. Great for beginners or anyone training for a race.",
      },
      {
        title: "Yoga & Stretching Sessions (Group Discounts)",
        price: "$12/person",
        snippet:
          "200-hour certified yoga instructor. I teach vinyasa flow and gentle stretch classes. Perfect for stress relief during finals. Groups of 3+ get a discount.",
      },
      {
        title: "Boxing & HIIT Training",
        price: "$25/session",
        snippet:
          "Former amateur boxer. I combine boxing fundamentals with high-intensity interval training. Great for stress relief and getting in shape fast. Gloves provided.",
      },
    ],
    faqs: [
      {
        question: "Do I need gym experience to hire a trainer?",
        answer:
          "Not at all! Most student trainers work with complete beginners. They'll teach you proper form and create a plan that matches your current fitness level.",
      },
      {
        question: "Where do training sessions happen?",
        answer:
          "Most sessions happen at the campus recreation center or gym. Some trainers also offer outdoor sessions on campus fields or tracks.",
      },
      {
        question: "Can I do group training with friends?",
        answer:
          "Yes! Many trainers offer group rates that are cheaper per person. It's a fun way to stay accountable with friends.",
      },
    ],
    ctaText: "Find a Trainer",
    ctaLink: "/feed?type=service&category=fitness",
    feedFilter: {
      type: "service",
      category: "fitness",
    },
  },

  "tech-help": {
    slug: SERVICE_CATEGORIES["tech-help"].slug,
    title: "Tech Help and Computer Services",
    heroTitle: "Tech Support from Students Who Know Their Stuff",
    heroSubtitle:
      "Computer repair, setup, and troubleshooting at student-friendly prices",
    description:
      "Get affordable tech help from knowledgeable students on your campus. From laptop repair to software setup, Wi-Fi troubleshooting to data recovery.",
    keywords: [...SERVICE_CATEGORIES["tech-help"].keywords],
    benefits: [
      "Affordable tech support from fellow students",
      "Laptop and phone repairs on campus",
      "Software installation and setup help",
      "Wi-Fi, printer, and network troubleshooting",
      "Website and app building for projects",
      "Data recovery and backup assistance",
    ],
    examplePosts: [
      {
        title: "Laptop Repair & Cleanup Service",
        price: "From $25",
        snippet:
          "CS major. I fix slow laptops, replace batteries and screens, clean up malware, and install SSDs. Most repairs done same day. Windows and Mac.",
      },
      {
        title: "Website Building for Class Projects",
        price: "$50-150",
        snippet:
          "Full-stack developer. I build clean websites for class projects, portfolios, or student orgs. React, WordPress, or basic HTML/CSS depending on your needs.",
      },
      {
        title: "Phone Screen Repair - iPhone & Android",
        price: "From $40",
        snippet:
          "I've fixed 100+ screens. Quality parts with a 30-day warranty. Most repairs take under an hour. Way cheaper than the Apple Store.",
      },
      {
        title: "Resume & LinkedIn Profile Setup",
        price: "$20",
        snippet:
          "Career center peer advisor. I'll help format your resume in LaTeX or Word and optimize your LinkedIn profile for internship searches.",
      },
    ],
    faqs: [
      {
        question: "What kinds of tech problems can students help with?",
        answer:
          "Common services include slow computer fixes, virus removal, screen repairs, software installation, Wi-Fi issues, printer setup, and building websites for projects.",
      },
      {
        question: "Is it safe to hand over my laptop?",
        answer:
          "All users are verified with .edu emails. You can stay present during repairs, or ask the tech to work in a public campus location for peace of mind.",
      },
      {
        question: "How long do repairs usually take?",
        answer:
          "Simple fixes like software cleanup or setup take 30-60 minutes. Hardware repairs like screen replacements may take a few hours to a day depending on parts availability.",
      },
    ],
    ctaText: "Get Tech Help",
    ctaLink: "/feed?type=service&category=tech-help",
    feedFilter: {
      type: "service",
      category: "tech-help",
    },
  },

  transportation: {
    slug: SERVICE_CATEGORIES.transportation.slug,
    title: "Ride Share and Transportation",
    heroTitle: "Ride Sharing Between Students",
    heroSubtitle: "Split gas to the airport, city trips, and break travel",
    description:
      "Connect with students for ride sharing to airports, nearby cities, and home during breaks. Share costs and make the journey more enjoyable.",
    keywords: [...SERVICE_CATEGORIES.transportation.keywords],
    benefits: [
      "Share gas costs with fellow students",
      "Rides to airports and train stations",
      "Holiday and break travel options",
      "Verified student drivers and passengers",
      "Flexible scheduling around exam dates",
      "Meet people from your area",
    ],
    examplePosts: [
      {
        title: "Ride to Airport - Friday 12/15 Morning",
        price: "$20/person",
        snippet:
          "Driving to the airport Friday at 8am for winter break. Have room for 3 passengers with luggage. Splitting gas evenly.",
      },
      {
        title: "Weekend Trip to the City - Saturday",
        price: "$10/person",
        snippet:
          "Heading downtown this Saturday for shopping and food. Leaving at 10am, coming back around 8pm. Room for 3.",
      },
      {
        title: "Looking for Ride Share to NYC Area",
        price: "Will split gas",
        snippet:
          "Need a ride to the NYC metro area for Thanksgiving break (11/22). Happy to split gas and tolls. Can be flexible on timing.",
      },
      {
        title: "Weekly Grocery Run - Carpool Wednesdays",
        price: "$5/trip",
        snippet:
          "I drive to the grocery store every Wednesday at 4pm. Room for 2-3 people. Way easier than the campus shuttle schedule.",
      },
    ],
    faqs: [
      {
        question: "How is cost typically split?",
        answer:
          "Most drivers split gas and tolls evenly among passengers. Discuss specifics with the driver when arranging the ride.",
      },
      {
        question: "Is ride sharing safe?",
        answer:
          "All users are verified students. We recommend meeting drivers in a public campus spot, sharing your trip details with a friend, and communicating through the app.",
      },
      {
        question: "What about luggage space?",
        answer:
          "Mention your luggage needs when reaching out. Most sedans fit 2-3 passengers with bags. SUV drivers can accommodate more.",
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
    title: "Student Photography Services",
    heroTitle: "Capture Your College Memories",
    heroSubtitle:
      "Talented student photographers for portraits, events, and graduation",
    description:
      "Find talented student photographers for portraits, events, graduation photos, and more. Affordable rates and creative perspectives from your campus community.",
    keywords: [...SERVICE_CATEGORIES.photography.keywords],
    benefits: [
      "Affordable rates from student photographers ($40-150)",
      "Unique creative perspectives and styles",
      "Familiar with the best photo spots on campus",
      "Portrait, event, and graduation photography",
      "Quick turnaround on edited photos",
      "Couples, friend groups, and solo shoots",
    ],
    examplePosts: [
      {
        title: "Graduation Photo Sessions - Book Now",
        price: "$75/session",
        snippet:
          "30-minute session, 20+ edited photos delivered within a week. I know all the best spots on campus. Cap and gown or casual. Book before May fills up!",
      },
      {
        title: "Portrait Photography - Headshots & Creative",
        price: "$50/session",
        snippet:
          "Art major with 4 years of portrait experience. LinkedIn headshots, dating profile photos, or artistic portraits. Indoor and outdoor locations.",
      },
      {
        title: "Event Photography - Parties, Formals, Org Events",
        price: "$100/event",
        snippet:
          "I cover campus events, Greek life formals, and club activities. 2 hours of coverage, all edited photos delivered via Google Drive within 3 days.",
      },
      {
        title: "Couple & Friend Group Photoshoots",
        price: "$60/session",
        snippet:
          "Golden hour shoots, candid and posed. I make it fun and low-pressure. Perfect for anniversary gifts or just making memories with your crew.",
      },
    ],
    faqs: [
      {
        question: "What types of photography are available?",
        answer:
          "Student photographers offer portraits, graduation photos, event coverage, headshots, couple shoots, and creative photoshoots. Many specialize in specific styles.",
      },
      {
        question: "How much do student photographers charge?",
        answer:
          "Rates vary by photographer and session type, typically $40-150 for portrait sessions. Event coverage is usually priced hourly at $40-60/hr.",
      },
      {
        question: "How do I see a photographer's portfolio?",
        answer:
          "Most photographers include sample work in their listings or link to Instagram/portfolio sites. Message them for additional examples in your preferred style.",
      },
      {
        question: "How quickly will I receive my photos?",
        answer:
          "Most student photographers deliver edited photos within 3-7 days. Rush delivery may be available for an additional fee.",
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
    title: "Student Housing and Roommates",
    heroTitle: "Find Housing and Roommates Near Campus",
    heroSubtitle: "Off-campus living, sublets, and compatible roommates",
    description:
      "Connect with students looking for housing, roommates, and sublets. Find off-campus living situations near your campus with verified student community members.",
    keywords: [...SERVICE_CATEGORIES.housing.keywords],
    benefits: [
      "Find roommates from your campus community",
      "Sublet opportunities for summer and breaks",
      "Off-campus apartment and house listings",
      "Verified student community members",
      "Local area knowledge from current tenants",
      "Group housing for friend groups",
    ],
    examplePosts: [
      {
        title: "Room Available in 3BR Apartment - Spring Semester",
        price: "$550/mo",
        snippet:
          "One room opening up in a 3BR apartment 5 min walk from campus. Furnished common areas, washer/dryer in unit. Two chill roommates (juniors). Utilities split 3 ways.",
      },
      {
        title: "Summer Sublet - Studio Near Campus",
        price: "$475/mo",
        snippet:
          "Subletting my studio from May 15 to Aug 15. Fully furnished, AC, walking distance to campus. Perfect for summer research or internships.",
      },
      {
        title: "Looking for Roommate - 2BR Lease Starting August",
        price: "$625/mo each",
        snippet:
          "Signing a lease for a 2BR apartment and need one more person. Quiet, clean, and studious. Pets allowed in the building. Close to campus shuttle stop.",
      },
      {
        title: "4 Rooms Available in House - Great for Friend Groups",
        price: "$500/mo each",
        snippet:
          "Big house 10 min from campus with 4 open rooms. Huge backyard, garage, 2 full bathrooms. Looking for a group or individuals. Lease starts June 1.",
      },
    ],
    faqs: [
      {
        question: "What housing options are available?",
        answer:
          "Students post room shares, apartment sublets, roommate searches, and full house listings. Most are walking distance or a short drive from campus.",
      },
      {
        question: "When do most housing posts appear?",
        answer:
          "Spring semester (Feb-April) is peak season as students plan for next year. Summer sublets are posted March-May. Check regularly for new listings.",
      },
      {
        question: "How do I find a compatible roommate?",
        answer:
          "Listings often include lifestyle preferences (study habits, noise level, cleanliness). Message potential roommates to discuss expectations before committing.",
      },
      {
        question: "Should I visit the place before signing?",
        answer:
          "Always visit in person if possible. Check the condition, meet current tenants, and verify the landlord's contact info. Never send money without seeing the space.",
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
    title: "Student Services and Skills",
    heroTitle: "Discover Skills and Services from Your Campus Community",
    heroSubtitle: "Whatever you need, a fellow student probably offers it",
    description:
      "Browse a wide variety of student services including moving help, language practice, editing, graphic design, and much more from your campus community.",
    keywords: [...SERVICE_CATEGORIES.other.keywords],
    benefits: [
      "Wide variety of student talents and skills",
      "Affordable peer-to-peer services",
      "Support fellow students while saving money",
      "Convenient on-campus service delivery",
      "Verified community members",
      "From moving help to graphic design",
    ],
    examplePosts: [
      {
        title: "Moving Help - Strong Arms, Reasonable Rates",
        price: "$15/hr",
        snippet:
          "Two guys with a truck (well, an SUV). We'll help you move in, move out, or rearrange furniture. On-campus or local moves only.",
      },
      {
        title: "Graphic Design - Logos, Flyers, Social Media",
        price: "From $25",
        snippet:
          "Design major. I create logos, event flyers, social media graphics, and presentation decks. Fast turnaround. See my portfolio in the listing photos.",
      },
      {
        title: "Spanish-English Translation & Interpretation",
        price: "$20/hr",
        snippet:
          "Bilingual (native Spanish speaker). I translate documents, help with language homework, and offer conversation practice for any level.",
      },
      {
        title: "Dog Walking & Pet Sitting",
        price: "$12/walk",
        snippet:
          "Animal science major who loves dogs. I offer 30-min walks around campus and pet sitting when you travel. References available from 5+ current clients.",
      },
      {
        title: "Video Editing for Projects & Social Media",
        price: "$30/video",
        snippet:
          "I edit in Premiere Pro and After Effects. Class projects, YouTube videos, TikToks, or club promo content. Send me your raw footage and I'll make it shine.",
      },
    ],
    faqs: [
      {
        question: "What kinds of services can I find?",
        answer:
          "Students offer moving help, graphic design, translation, pet care, video editing, car detailing, meal prep, and much more. If you have a skill, you can list it.",
      },
      {
        question: "Can I offer my own services?",
        answer:
          "Yes! Create a service listing describing your skills, rates, and availability. It's a great way to earn money while helping your campus community.",
      },
      {
        question: "How do payments work?",
        answer:
          "Payments are arranged directly between students. Most use Venmo, Zelle, or cash. Agree on payment terms before the work begins.",
      },
    ],
    ctaText: "Browse All Services",
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
      "GimmeDat serves the Gettysburg College community in Gettysburg, Pennsylvania. Buy, sell, and trade textbooks, services, and more with verified students in Adams County.",
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
        question: "Who can use GimmeDat in Gettysburg?",
        answer:
          "GimmeDat is primarily for Gettysburg College students with verified .edu email addresses. This ensures a safe, trusted campus community.",
      },
      {
        question: "Where should I meet to exchange items?",
        answer:
          "We recommend public campus locations like the CUB, library, or student center. Downtown Gettysburg businesses are also good options.",
      },
      {
        question: "Is GimmeDat only for Gettysburg College?",
        answer:
          "GimmeDat started at Gettysburg College but is expanding to serve more campuses. Any student with a verified .edu email can join.",
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
      "GimmeDat serves students in Adams County, Pennsylvania, centered on Gettysburg College. Find local student services, items for sale, and community connections.",
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
        question: "Does GimmeDat serve all of Adams County?",
        answer:
          "GimmeDat is centered on Gettysburg College but welcomes the broader Adams County student community. Listings may include off-campus services.",
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
