import fs from 'node:fs';
import path from 'node:path';

type DetailedStop = {
  position: number;
  slug: string;
  title: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  shortDescription: string;
  fullDescription: string;
  transcript: string;
  image: {
    fileName?: string;
    imageUrl: string;
    sourceUrl: string;
    creator: string;
    licenseName: string;
    licenseUrl: string;
    attributionText: string;
    rightsStatus: string;
  };
};

type DetailedTour = {
  tourSlug: string;
  status: string;
  publicationReadiness?: string;
  city: {
    name: string;
    country: string;
    flagEmoji: string;
    centerLat: number;
    centerLng: number;
    subtitle: string;
    description: string;
  };
  tour: {
    title: string;
    subtitle: string;
    overview: string;
  };
  stops: DetailedStop[];
};

const sourceDirectory = path.resolve('content/pilot-catalogue');
const requestedSlug = process.argv.find((argument) => argument.startsWith('--tour='))?.slice('--tour='.length);
const mediaOnly = process.argv.includes('--media-only');
const outputFile = path.resolve(mediaOnly
  ? '.tmp/pilot-media-import.json'
  : requestedSlug
  ? `.tmp/pilot-import-${requestedSlug}.json`
  : '.tmp/pilot-import-media-cleared.json');
const sourceFiles = fs.readdirSync(sourceDirectory)
  .filter((file) => file.endsWith('.en.json'))
  .sort();

const packages = sourceFiles
  .map((file) => JSON.parse(fs.readFileSync(path.join(sourceDirectory, file), 'utf8')) as DetailedTour)
  .filter((tour) => tour.status === 'research_complete_cms_draft_pending')
  .filter((tour) => !requestedSlug || tour.tourSlug === requestedSlug)
  .filter((tour) => tour.stops.every((stop) => stop.image.rightsStatus !== 'permission_required'));

if (requestedSlug && packages.length !== 1) {
  throw new Error(`Expected one media-cleared package for ${requestedSlug}, found ${packages.length}.`);
}

if (!requestedSlug && packages.length < 1) {
  throw new Error('No media-cleared tour packages were found.');
}

const cities = packages.map((item) => ({
  id: item.tourSlug,
  name: item.city.name,
  country: item.city.country,
  flagEmoji: item.city.flagEmoji,
  subtitle: item.tour.subtitle,
  description: item.tour.overview,
  centerLat: item.city.centerLat,
  centerLng: item.city.centerLng,
  status: 'draft',
}));

const sites = packages.flatMap((item) => item.stops.map((stop) => ({
  id: stop.slug,
  name: stop.title,
  hebrewName: '',
  category: stop.category,
  cityId: item.tourSlug,
  cityName: item.city.name,
  lat: stop.lat,
  lng: stop.lng,
  address: stop.address,
  shortDescription: stop.shortDescription,
  fullDescription: stop.fullDescription,
  audioDuration: Math.max(30, Math.round(stop.transcript.split(/\s+/).length / 2.5)),
  transcript: stop.transcript,
  historicalPeriod: '',
  imageUrl: stop.image.imageUrl,
  imageCredit: stop.image.attributionText,
  imageSourceUrl: stop.image.sourceUrl,
  imageLicenseName: stop.image.licenseName,
  imageLicenseUrl: stop.image.licenseUrl,
  tags: [stop.category],
  keyFacts: [],
  tourOrder: stop.position,
  status: 'draft',
})));

const licensedMedia = packages.flatMap((item) => item.stops.map((stop) => ({
  stopRef: stop.slug,
  cityName: item.city.name,
  stopName: stop.title,
  imageUrl: stop.image.imageUrl,
  originalFilename: stop.image.fileName || decodeURIComponent(stop.image.sourceUrl.split('/').pop() || `${stop.slug}.jpg`).replace(/^File:/i, ''),
  rights: {
    rightsStatus: stop.image.rightsStatus === 'cc0' ? 'public_domain' : stop.image.rightsStatus,
    creatorName: stop.image.creator,
    sourceUrl: stop.image.sourceUrl,
    licenseName: stop.image.licenseName,
    licenseUrl: stop.image.licenseUrl,
    attributionText: stop.image.attributionText,
    rightsNotes: 'Imported from the reviewed Tudela pilot catalogue package.',
  },
})));

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  importPolicy: 'draft_only_cms_review_required',
  note: 'All photographs are stored privately and require normal CMS media approval before publication.',
  cities: mediaOnly ? [] : cities,
  sites: mediaOnly ? [] : sites,
  licensedMedia,
}, null, 2)}\n`, 'utf8');

console.log(`Created ${outputFile}: ${mediaOnly ? 0 : cities.length} cities, ${mediaOnly ? 0 : sites.length} stops and ${licensedMedia.length} licensed photographs.`);
