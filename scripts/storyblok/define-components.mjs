// Creates/updates all Storyblok components, mirroring the old tina/config.ts schema.
// Mapping rules: string -> text, textarea -> textarea, image -> asset,
// object list -> nestable blok list, string list -> textarea (one per line).
// Run: node scripts/storyblok/define-components.mjs
import { mapi } from './lib.mjs';

// Field helpers. display_name keeps the editor labels from the Tina config.
const t = (d) => ({ type: 'text', display_name: d });
const ta = (d) => ({ type: 'textarea', display_name: d });
const img = (d) => ({ type: 'asset', filetypes: ['images'], display_name: d });
const num = (d) => ({ type: 'number', display_name: d });
const bool = (d) => ({ type: 'boolean', display_name: d });
const rich = (d) => ({ type: 'richtext', display_name: d });
const bloks = (d, whitelist, max) => ({
  type: 'bloks',
  display_name: d,
  restrict_components: true,
  component_whitelist: whitelist,
  ...(max ? { maximum: max } : {}),
});
const opt = (d, options) => ({
  type: 'option',
  display_name: d,
  options: options.map((o) => ({ name: o, value: o })),
});

const seo = {
  seo_title: t('SEO Title (Browser Tab)'),
  seo_description: ta('SEO Description (Google)'),
};
const heroFlat = {
  hero_caption: t('Hero Caption'),
  hero_heading: t('Hero Heading'),
  hero_intro: ta('Hero Intro'),
  hero_image: img('Hero Image'),
  hero_image_alt: t('Hero Image Alt Text'),
};
const introFlat = {
  intro_heading: t('Intro Heading'),
  intro_body: ta('Intro Body'),
  intro_image: img('Intro Image'),
};

// name -> [display_name, schema] ; nestable section/item bloks
const NESTABLE = {
  hero: ['Hero Section', {
    image: img('Background Image'), image_alt: t('Image Alt Text'),
    caption: t('Location Label'), headline_line1: t('Headline Line 1'),
    headline_line2: t('Headline Line 2 (italic)'), body: ta('Intro Text'),
    cta_primary_label: t('Primary Button Text'), cta_primary_href: t('Primary Button Link'),
    cta_secondary_label: t('Secondary Button Text'), cta_secondary_href: t('Secondary Button Link'),
  }],
  pillar: ['Pillar', { number: t('Number (e.g. "01")'), heading: t('Heading'), body: ta('Description') }],
  packages_section: ['Packages Section (Headings)', {
    caption: t('Category Label'), heading: t('Section Heading'), all_link_label: t('"All Packages" Button Text'),
  }],
  rooms_section: ['Rooms Section (Headings)', {
    caption: t('Category Label'), heading: t('Section Heading'), body: ta('Intro Text'),
    all_link_label: t('"All Rooms" Button Text'), featured_image: img('Featured Preview Image'),
  }],
  therme_cta: ['Thermal Spa Section', {
    background_image: img('Background Image'), caption: t('Category Label'),
    heading: t('Section Heading'), body: ta('Description'),
    stat_1_value: t('Stat 1 Value'), stat_1_label: t('Stat 1 Label'),
    stat_2_value: t('Stat 2 Value'), stat_2_label: t('Stat 2 Label'),
    stat_3_value: t('Stat 3 Value'), stat_3_label: t('Stat 3 Label'),
    cta_primary_label: t('Primary Button Text'), cta_secondary_label: t('Secondary Button Text'),
  }],
  voucher_strip: ['Gift Vouchers Section', {
    caption: t('Category Label'), heading: t('Heading'), subheading: t('Second Line (italic)'),
  }],
  popup: ['Welcome Pop-up', {
    enabled: bool('Show the pop-up?'), heading: t('Heading'), body: ta('Text'),
    image: img('Image (optional)'), image_alt: t('Image Alt Text'),
  }],
  venue: ['Venue', {
    name: t('Name'), tagline: t('Tagline'), image: img('Image'), body: ta('Description'),
    highlight: t('Highlight Note (optional)'), note: t('Status Note (optional)'),
    hours: ta('Opening Hours (one per line)'),
  }],
  buffet_item: ['Buffet Item', { label: t('Item Label'), price: t('Price (e.g. "22,00 €")') }],
  activity_card: ['Activity Card', { title: t('Title'), image: img('Image'), body: ta('Description') }],
  link: ['Link', { label: t('Link Text'), href: t('URL') }],
  feature_section: ['Feature Section', {
    heading: t('Heading'), image: img('Image'), image_alt: t('Image Alt Text'),
    paragraphs: ta('Paragraphs (one per line)'), links: bloks('External Links', ['link']),
  }],
  voucher_category: ['Voucher Category', { name: t('Name'), image: img('Image') }],
  action_activity: ['Action Activity', {
    title: t('Title'), description: ta('Description'), location: t('Location'),
    distance: t('Distance (e.g. "ca. 30 min")'), link_href: t('Website URL'),
  }],
  aktiv_section: ['Activity Section', {
    heading: t('Heading'), image: img('Image'), image_alt: t('Image Alt Text'),
    paragraphs: ta('Paragraphs (one per line)'),
    highlight_heading: t('Highlight Box Heading'), highlight_body: ta('Highlight Box Text'),
    highlight_link_label: t('Highlight Link Text'), highlight_link_href: t('Highlight Link URL'),
  }],
  excursion: ['Excursion', {
    title: t('Title'), category: t('Category'), image: img('Image'), image_alt: t('Image Alt Text'),
    schedule: t('Schedule'), duration: t('Duration'), meeting_point: t('Meeting Point'),
    highlights: ta('Highlights (one per line)'), link_label: t('Link Text'), link_href: t('Link URL'),
  }],
  facility_section: ['Facility Section', { heading: t('Heading'), items: ta('Items (one per line)') }],
  initiative: ['Initiative', { title: t('Title'), body: ta('Text') }],
  gallery_item: ['Gallery Photo', { image: img('Photo'), caption: t('Caption'), alt: t('Alt Text') }],
  spec: ['Room Spec', { label: t('Label'), value: t('Value') }],
  feature_group: ['Amenity Group', { heading: t('Group Heading'), items: ta('Features (one per line)') }],
  pricing_tier: ['Pricing Tier', {
    duration: t('Duration'), price_from: num('From Price in EUR'),
    price_note: t('Price Note'), href: t('Booking URL'),
  }],
  highlight_card: ['Feature Highlight', { title: t('Title'), text: ta('Text') }],
  points_row: ['Points Catalog Row', { points: t('Points Label'), items: ta('Treatments (separate with |)') }],
  program_row: ['Program Table Row', {
    treatment: t('Treatment'), effect: ta('Effect'), values: ta('Values per Column (one per line)'),
  }],
  nav_link: ['Header Nav Link', {
    mega_menu_id: t('Section (hotel | therme | gesundheit | angebote | allgaeu)'),
    column_heading: t('Column Heading (must match exactly)'),
    label: t('Link Text'), href: t('URL Path'), sort_order: num('Order Among Manual Links'),
  }],
  footer_column: ['Footer Column', { heading: t('Column Heading'), links: bloks('Links', ['link']) }],
};

// name -> [display_name, schema] ; root content types
const ROOTS = {
  homepage: ['Homepage', {
    ...seo,
    hero: bloks('Hero Section', ['hero'], 1),
    pillars: bloks('Three Pillars', ['pillar'], 3),
    packages_section: bloks('Packages Section', ['packages_section'], 1),
    rooms_section: bloks('Rooms Section', ['rooms_section'], 1),
    therme_cta: bloks('Thermal Spa Section', ['therme_cta'], 1),
    voucher_strip: bloks('Gift Vouchers Section', ['voucher_strip'], 1),
    popup: bloks('Welcome Pop-up', ['popup'], 1),
  }],
  page_hotel: ['Hotel & Resort Page', {
    ...seo, ...heroFlat, ...introFlat,
    highlight_1_heading: t('Highlight 1 Heading'), highlight_1_body: ta('Highlight 1 Body'),
    highlight_2_heading: t('Highlight 2 Heading'), highlight_2_body: ta('Highlight 2 Body'),
    highlight_3_heading: t('Highlight 3 Heading'), highlight_3_body: ta('Highlight 3 Body'),
  }],
  page_therme: ['Therme Page', {
    ...seo, ...heroFlat, ...introFlat,
    stat_1_value: t('Stat 1 Value'), stat_1_label: t('Stat 1 Label'),
    stat_2_value: t('Stat 2 Value'), stat_2_label: t('Stat 2 Label'),
    stat_3_value: t('Stat 3 Value'), stat_3_label: t('Stat 3 Label'),
  }],
  page_gesundheit: ['Gesundheit Page', { ...seo, ...heroFlat, ...introFlat }],
  page_kulinarik: ['Kulinarik Page', {
    ...seo, ...heroFlat, ...introFlat,
    venues: bloks('Venues', ['venue']),
    buffet_heading: t('Buffet Section Heading'),
    buffet_items: bloks('Buffet Price List', ['buffet_item']),
    buffet_note: ta('Buffet Note'),
  }],
  page_allgaeu: ['Allgäu erleben Page', {
    ...seo, ...heroFlat, ...introFlat,
    activities: bloks('Activity Cards', ['activity_card']),
    features: bloks('Feature Sections', ['feature_section']),
  }],
  page_gutscheine: ['Gutscheine Page', {
    ...seo, ...heroFlat,
    intro_heading: t('Intro Heading'), intro_body: ta('Intro Body'),
    intro_cta_label: t('Intro Button Text'), intro_cta_href: t('Intro Button Link'),
    intro_image: img('Intro Image'), intro_quote: t('Intro Quote'),
    steps_heading: t('"How It Works" Heading'), steps: ta('Steps (one per line)'),
    categories_heading: t('Categories Heading'), categories_intro: ta('Categories Intro'),
    categories: bloks('Voucher Categories', ['voucher_category']),
    partner_heading: t('Partner Section Heading'), partner_body: ta('Partner Section Body'),
    cta_buy_label: t('Buy Button Text'), cta_buy_href: t('Buy Button Link'),
  }],
  subpage: ['Subpage (Hero + Intro)', {
    ...seo, ...heroFlat, ...introFlat,
    note: ta('Note (Öffnungszeiten page only)'),
    note_hotel_guests: ta('Hotel Guests Note (Therme Preise only)'),
    note_day_guests: ta('Day Guests Note (Therme Preise only)'),
    no_open_positions_note: ta('No Open Positions Note (Jobs only)'),
    privacy_note: ta('Privacy Note (Newsletter only)'),
  }],
  page_allgaeu_action: ['Allgäu: Action & Adrenalin', {
    ...seo, ...heroFlat, activities: bloks('Activities', ['action_activity']),
  }],
  page_allgaeu_aktiv: ['Allgäu: Aktiv sein', {
    ...seo, ...heroFlat, hero_subheading: t('Hero Subheading'),
    sections: bloks('Activity Sections', ['aktiv_section']),
    ebike_heading: t('E-Bike Section Heading'), ebike_image: img('E-Bike Image'),
    ebike_image_alt: t('E-Bike Image Alt Text'), ebike_details: ta('E-Bike Details (one per line)'),
  }],
  page_allgaeu_ausflug: ['Allgäu: Ausflugsziele', {
    ...seo, ...heroFlat, intro: ta('Intro Text'), excursions: bloks('Excursions', ['excursion']),
  }],
  page_hotel_uebersicht: ['Hotel: Resortübersicht', {
    ...seo, ...heroFlat, ...introFlat, intro_image_alt: t('Intro Image Alt Text'),
    facility_sections: bloks('Facility Sections', ['facility_section']),
    location_heading: t('Location Section Heading'), location_body: ta('Location Section Body'),
    location_image: img('Location Image'), location_image_alt: t('Location Image Alt Text'),
  }],
  page_vitalkueche: ['Kulinarik: Vitalküche', {
    ...seo, ...heroFlat, ...introFlat, intro_image_alt: t('Intro Image Alt Text'),
    concept_heading: t('Concept Heading'), concept_body: ta('Concept Body'),
    food_groups_heading: t('Food Groups Heading'), food_groups: ta('Food Groups (one per line)'),
    cta_heading: t('CTA Heading'), cta_body: ta('CTA Body'),
    cta_link_label: t('CTA Button Text'), cta_link_href: t('CTA Button Link'),
  }],
  page_nachhaltigkeit: ['Nachhaltigkeit Page', {
    ...seo, ...heroFlat,
    intro_heading: t('Intro Heading'), intro_body: ta('Intro Body'), intro_quote: t('Intro Quote'),
    initiatives: bloks('Initiatives', ['initiative']),
  }],
  page_rooms_overview: ['Rooms Overview Page', {
    ...seo, ...heroFlat, intro_image: img('Intro Image'),
    amenities_heading: t('Amenities Heading'), amenities_subheading: t('Amenities Subheading'),
    amenities: ta('Amenities (one per line)'),
    cta_heading: t('CTA Heading'), cta_body: ta('CTA Body'),
  }],
  page_service_kontakt: ['Service & Kontakt Page', {
    ...seo, ...heroFlat,
    address_label: t('Address Card Label'), phone_label: t('Phone Card Label'),
    email_label: t('Email Card Label'), directions_heading: t('Directions Heading'),
    directions_by_car: ta('Directions by Car'), directions_by_train: ta('Directions by Train'),
    opening_hours_reception: t('Reception Opening Hours'),
  }],
  page_impressum: ['Impressum Page', {
    ...seo, heading: t('Page Heading'), company_name: t('Company Name'),
    company_subtitle: t('Company Subtitle'), address_street: t('Street Address'),
    address_zip_city: t('Postcode & City'), managing_director: t('Managing Director'),
    register_court: t('Register Court'), register_number: t('Register Number'),
    vat_id: t('VAT ID'), content_responsible: t('Responsible for Content'),
    liability_text: ta('Liability Text'), links_text: ta('External Links Text'),
  }],
  page_datenschutz: ['Datenschutz Page', {
    ...seo, heading: t('Page Heading'), intro: ta('Intro'),
    section_responsible_heading: t('Responsible Party: Heading'), section_responsible_body: ta('Responsible Party: Text'),
    section_data_heading: t('Data Collection: Heading'), section_data_body: ta('Data Collection: Text'),
    section_cookies_heading: t('Cookies: Heading'), section_cookies_body: ta('Cookies: Text'),
    section_rights_heading: t('Your Rights: Heading'), section_rights_body: ta('Your Rights: Text'),
    contact_dpo: t('Data Protection Contact'),
  }],
  room: ['Room / Suite', {
    name: t('Room Name'), variants: t('Room Categories'), tagline: t('Short Tagline'),
    size: t('Room Size (e.g. "ab 28 m²")'), capacity: t('Occupancy'),
    highlight: bool('Show "Popular" Badge?'), sort_order: num('Display Order in Listing'),
    seo_title: t('SEO Title'), seo_description: ta('SEO Description'),
    hero_image: img('Hero Image (detail page)'), preview_image: img('Preview Image (listing card)'),
    gallery: bloks('Photo Gallery', ['gallery_item']),
    intro_heading: t('Description Section Heading'), intro_subheading: t('Description Subheading'),
    specs: bloks('Room Data (sidebar)', ['spec']),
    feature_groups: bloks('Amenity Groups', ['feature_group']),
    body: rich('Description'),
  }],
  package: ['Package / Offer', {
    title: t('Package Name'),
    tag: opt('Category', [
      'Heilung & Regeneration', 'Entschlackung & Entgiftung',
      'Entschleunigung & Wellness', 'Saisonal & Specials',
    ]),
    subtitle: t('Subtitle / Tagline'), nights: t('Duration (e.g. "2 Nächte")'),
    teaser: ta('Short Description (homepage card)'),
    image: img('Preview Image'), image_alt: t('Image Alt Text'),
    price_from: num('Starting Price in EUR'), price_label: t('Price Suffix'),
    booking_link: t('Booking Link (single option)'),
    booking_options: bloks('Booking Options', ['link']),
    nav_order: num('Nav Order in Mega Menu'), show_in_nav: bool('Show in Angebote Mega Menu?'),
    includes: ta("What's Included (one per line)"), inclusion_note: ta('Note Below Inclusions List'),
    recommendations: ta('Our Recommendation (one per line)'),
    availability: ta('Dates / Availability'), availability_note: ta('Availability Note'),
    pricing_tiers: bloks('Pricing Tiers', ['pricing_tier']),
    highlights: bloks('Feature Highlights', ['highlight_card']),
    program_intro: ta('Program Intro'),
    points_catalog: bloks('Points Catalog', ['points_row']),
    program_columns: ta('Program Table Columns (one per line)'),
    program_rows: bloks('Program Table Rows', ['program_row']),
    gallery: bloks('Image Gallery', ['gallery_item']),
    closing_heading: t('Closing Section Heading'), closing_body: ta('Closing Section Text'),
    body: rich('Article Body'),
  }],
  article: ['News / Blog Post', {
    title: t('Headline'), seo_title: t('SEO Title'), seo_description: ta('SEO Description'),
    date: t('Date (YYYY-MM-DD)'), author: t('Author'), category: t('Category'),
    teaser: ta('Teaser'), image: img('Featured Image'), image_alt: t('Featured Image Alt Text'),
    body: rich('Article Content'),
  }],
  site_settings: ['Global Settings', {
    hotel_name: t('Hotel Name'), tagline: t('Hotel Tagline'),
    address_street: t('Street Address'), address_zip_city: t('Postcode & City'),
    address_region: t('State / Region'), address_country: t('Country'),
    phone_display: t('Phone Number (display)'), phone_link: t('Phone Number (tel link)'),
    email: t('Email Address'), social_instagram: t('Instagram Link'), social_facebook: t('Facebook Link'),
    default_og_image: img('Default Social Preview Image'), copyright_name: t('Copyright Text'),
    header_nav_links: bloks('Header Mega Menu Extra Links', ['nav_link']),
    footer_columns: bloks('Footer Navigation', ['footer_column']),
  }],
};

function build(name, [display, schema], isRoot) {
  Object.values(schema).forEach((f, i) => (f.pos = i));
  return { name, display_name: display, schema, is_root: isRoot, is_nestable: !isRoot };
}

const existing = new Map(
  (await mapi('GET', '/components/')).components.map((c) => [c.name, c.id])
);

const all = [
  ...Object.entries(NESTABLE).map(([n, def]) => build(n, def, false)),
  ...Object.entries(ROOTS).map(([n, def]) => build(n, def, true)),
];

for (const component of all) {
  const id = existing.get(component.name);
  if (id) {
    await mapi('PUT', `/components/${id}`, { component });
    console.log(`updated  ${component.name}`);
  } else {
    await mapi('POST', '/components/', { component });
    console.log(`created  ${component.name}`);
  }
}
console.log(`\n${all.length} components in sync.`);
