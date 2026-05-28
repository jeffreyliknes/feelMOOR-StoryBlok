/**
 * Builds mega-menu navigation from collections (packages, rooms) plus optional
 * manual links from Global Settings (`header_nav_links` in site.json).
 */

export type NavLink = { label: string; href: string };

export type NavColumn = { heading: string; links: NavLink[] };

export type NavMegaItem = {
  id: string;
  label: string;
  href: string;
  columns: NavColumn[];
  featured: {
    tag: string;
    heading: string;
    body: string;
    cta: NavLink;
  };
};

export type HeaderNavExtra = {
  mega_menu_id: string;
  column_heading: string;
  label: string;
  href: string;
  sort_order?: number;
};

type PackageLike = {
  slug: string;
  data: {
    title: string;
    tag?: string;
    booking_link?: string;
    nav_order?: number;
    show_in_nav?: boolean;
  };
};

type RoomLike = {
  slug: string;
  data: {
    name: string;
    sort_order?: number;
  };
};

const COL_HEILUNG    = 'Heilung & Regeneration';
const COL_ENTSCHLACK = 'Entschlackung & Entgiftung';
const COL_WELLNESS   = 'Entschleunigung & Wellness';
const COL_SAISONAL   = 'Saisonal & Specials';

function packageHref(pkg: PackageLike): string {
  const link = pkg.data.booking_link?.trim();
  if (link && link.startsWith('/')) return link;
  if (link && /^https?:\/\//i.test(link)) return link;
  return `/angebote/${pkg.slug}`;
}

/** Maps package `tag` (frontmatter) to mega-menu column heading. */
function columnHeadingForPackageTag(tag?: string): string {
  const t = (tag ?? '').trim();
  if (t === COL_HEILUNG)    return COL_HEILUNG;
  if (t === COL_ENTSCHLACK) return COL_ENTSCHLACK;
  if (t === COL_WELLNESS)   return COL_WELLNESS;
  if (t === COL_SAISONAL)   return COL_SAISONAL;
  return COL_SAISONAL;
}

function buildAngeboteColumns(packages: PackageLike[]): NavColumn[] {
  const visible = packages
    .filter((p) => p.data.show_in_nav !== false)
    .sort(
      (a, b) =>
        (a.data.nav_order ?? 99) - (b.data.nav_order ?? 99) ||
        a.data.title.localeCompare(b.data.title, 'de')
    );

  const columns: NavColumn[] = [
    {
      heading: COL_HEILUNG,
      links: [{ label: 'Alle Angebote', href: '/angebote' }],
    },
    { heading: COL_ENTSCHLACK, links: [] },
    { heading: COL_WELLNESS,   links: [] },
    { heading: COL_SAISONAL,   links: [] },
  ];

  for (const pkg of visible) {
    const heading = columnHeadingForPackageTag(pkg.data.tag);
    const col = columns.find((c) => c.heading === heading);
    if (col) {
      col.links.push({ label: pkg.data.title, href: packageHref(pkg) });
    }
  }

  return columns;
}

function buildZimmerColumnLinks(rooms: RoomLike[]): NavLink[] {
  const sorted = [...rooms].sort(
    (a, b) => (a.data.sort_order ?? 99) - (b.data.sort_order ?? 99)
  );
  return [
    { label: 'Alle Zimmer', href: '/zimmer' },
    ...sorted.map((r) => ({
      label: r.data.name,
      href: `/zimmer/${r.slug}`,
    })),
  ];
}

function applyExtras(nav: NavMegaItem[], extras: HeaderNavExtra[]) {
  for (const item of nav) {
    for (const col of item.columns) {
      const additions = extras
        .filter(
          (e) =>
            e.mega_menu_id === item.id && e.column_heading === col.heading
        )
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
      for (const e of additions) {
        col.links.push({ label: e.label, href: e.href });
      }
    }
  }
}

function baseNavigation(): NavMegaItem[] {
  return [
    {
      id: 'hotel',
      label: 'Hotel & Resort',
      href: '/hotel',
      columns: [
        {
          heading: 'Das Resort',
          links: [
            { label: 'Über feelMOOR', href: '/hotel' },
            { label: 'Resort Übersicht', href: '/hotel/resort-uebersicht' },
            { label: 'Nachhaltigkeit', href: '/nachhaltigkeit' },
            { label: 'Anreise & Lage', href: '/service-kontakt' },
          ],
        },
        {
          heading: 'Zimmer & Suiten',
          links: [],
        },
        {
          heading: 'Kulinarik',
          links: [
            { label: 'Restaurant', href: '/kulinarik' },
            { label: 'Vitalkäche', href: '/kulinarik/vitalkueche' },
            { label: 'Kissenmenü', href: '/kulinarik/kissenmenue' },
            {
              label: 'Kulinarischer Kalender',
              href: '/kulinarik/kulinarischer-kalender',
            },
          ],
        },
      ],
      featured: {
        tag: 'Bad Wurzach · Allgäu',
        heading: 'Herzlich Willkommen',
        body:
          'Das modernste Moorbad Deutschlands im Herzen des Allgäus, Gesundheit, Natur und Genuss unter einem Dach.',
        cta: { label: 'Resort entdecken', href: '/hotel' },
      },
    },
    {
      id: 'therme',
      label: 'Therme & Spa',
      href: '/therme',
      columns: [
        {
          heading: 'feelMOOR Therme',
          links: [
            { label: 'Therme Übersicht', href: '/therme' },
            { label: 'Thermalbad', href: '/therme/thermalbad' },
            { label: 'Sauna', href: '/therme/sauna' },
            { label: 'Wellness & Spa', href: '/therme/wellness' },
          ],
        },
        {
          heading: 'Preise & Service',
          links: [
            { label: 'Preisliste', href: '/therme/preise' },
            { label: 'Öffnungszeiten', href: '/therme/oeffnungszeiten' },
            { label: 'Mitgliedschaften', href: '/fitness/mitgliedschaften' },
            { label: 'Gutscheine', href: '/gutscheine' },
          ],
        },
      ],
      featured: {
        tag: 'Thermalbad & Sauna',
        heading: 'Moorwasser-Therme',
        body:
          'Entspannen Sie in unserem Thermalbad mit heilsamem Moorwasser und unserer weitläufigen Saunalandschaft.',
        cta: { label: 'Therme entdecken', href: '/therme' },
      },
    },
    {
      id: 'gesundheit',
      label: 'Gesundheit',
      href: '/gesundheit',
      columns: [
        {
          heading: 'Moorheilbad',
          links: [
            { label: 'Gesundheit im feelMOOR', href: '/gesundheit' },
            { label: 'Das Moorbad', href: '/gesundheit/moorbad' },
            { label: 'Behandlungen', href: '/gesundheit/anwendungen' },
            {
              label: 'Ärzte & Therapeuten',
              href: '/gesundheit/aerzte-therapeuten',
            },
          ],
        },
        {
          heading: 'Fitness',
          links: [
            { label: 'Fitnessclub Übersicht', href: '/fitness' },
            { label: 'Fitnessstudio', href: '/fitness/studio' },
            { label: 'Kurse & Kursplan', href: '/fitness/kurse' },
            { label: 'Mitgliedschaften', href: '/fitness/mitgliedschaften' },
          ],
        },
      ],
      featured: {
        tag: 'Natürlich gesund',
        heading: 'Die Heilkraft des Moores',
        body:
          'Über 5.000 Jahre altes Naturmoor aus Bad Wurzach, Anerkanntes Heilbad für Orthopädie und Rehabilitation.',
        cta: { label: 'Gesundheit entdecken', href: '/gesundheit' },
      },
    },
    {
      id: 'angebote',
      label: 'Angebote',
      href: '/angebote',
      columns: [],
      featured: {
        tag: 'Jetzt verfügbar',
        heading: 'Pakete & Kuren',
        body:
          'Von der intensiven Moorheilkur bis zum entspannten Wellnesswochenende, wir haben das passende Paket für Sie.',
        cta: { label: 'Alle Angebote', href: '/angebote' },
      },
    },
    {
      id: 'allgaeu',
      label: 'Allgäu',
      href: '/allgaeu',
      columns: [
        {
          heading: 'Region entdecken',
          links: [
            { label: 'Das Allgäu', href: '/allgaeu' },
            { label: 'Ausflugsziele', href: '/allgaeu/ausflugsziele' },
            { label: 'Aktiv & Sport', href: '/allgaeu/aktiv-sein' },
            {
              label: 'Action & Adrenalin',
              href: '/allgaeu/action-adrenalin',
            },
          ],
        },
      ],
      featured: {
        tag: 'Natur pur',
        heading: 'Die Allgäuer Bergwelt',
        body:
          'Wandern, Radfahren und Naturerlebnisse rund um Bad Wurzach, direkt vor unserer Haustür.',
        cta: { label: 'Region entdecken', href: '/allgaeu' },
      },
    },
  ];
}

export function buildSiteNavigation(
  packages: PackageLike[],
  rooms: RoomLike[],
  extras: HeaderNavExtra[] = []
): NavMegaItem[] {
  const nav = baseNavigation();

  const angebote = nav.find((item) => item.id === 'angebote')!;
  angebote.columns = buildAngeboteColumns(packages);

  const hotel = nav.find((item) => item.id === 'hotel')!;
  const zimmerCol = hotel.columns.find((c) => c.heading === 'Zimmer & Suiten')!;
  zimmerCol.links = buildZimmerColumnLinks(rooms);

  applyExtras(nav, extras);
  return nav;
}
