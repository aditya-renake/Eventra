// Public API contracts: new database/configuration fields are private by default.
const EVENT_FIELDS = [
  'id', 'eventId', 'slug', 'name', 'tagline', 'description', 'category', 'structureType',
  'collegeName', 'clubName', 'clubCode', 'bannerUrl', 'themeColor', 'mode', 'startDate',
  'endDate', 'dateDisplay', 'timeDisplay', 'venue', 'venueHall', 'mapUrl', 'meetingUrl',
  'organizerName', 'organizerRole', 'organizerEmail', 'organizerPhone', 'alternatePOC',
  'pricingType', 'entryFee', 'feeDisplay', 'status', 'isFlagship', 'totalCapacity',
  'allowSpotRegistration', 'customQuestion', 'whatsappUrl', 'discordUrl', 'brochureUrl',
  'socialUrl', 'createdAt', 'updatedAt',
];
const CONFIG_FIELDS = [
  ...EVENT_FIELDS, 'activeEventId', 'eventName', 'eventTagline', 'eventDescription',
  'eventDate', 'eventTime', 'eventVenue', 'registrationMode', 'enablePaymentGateway',
  'currency', 'upiId', 'upiPayeeName', 'googleFormUrl', 'broadcastNotice', 'broadcastActive',
];
const pickScalars = (source, fields) => Object.fromEntries(fields
  .filter(key => source[key] !== undefined && (source[key] === null || ['string', 'number', 'boolean'].includes(typeof source[key])))
  .map(key => [key, source[key]]));

function publicCollections(source) {
  const result = {};
  for (const field of ['ticketTiers', 'tracks']) {
    if (Array.isArray(source[field])) result[field] = source[field].filter(value => typeof value === 'string');
  }
  if (source.ticketPrices && typeof source.ticketPrices === 'object') {
    result.ticketPrices = Object.fromEntries(Object.entries(source.ticketPrices)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0));
  }
  if (source.requiredFields && typeof source.requiredFields === 'object') {
    result.requiredFields = pickScalars(source.requiredFields, ['fullName', 'email', 'phone', 'college', 'branch', 'year', 'prn', 'github', 'linkedin']);
  }
  if (Array.isArray(source.schedule)) {
    result.schedule = source.schedule.map(item => pickScalars(item || {}, ['id', 'day', 'time', 'title', 'desc', 'description', 'venue']));
  }
  if (Array.isArray(source.subEvents)) {
    result.subEvents = source.subEvents.map(item => pickScalars(item || {}, ['id', 'name', 'description', 'category', 'entryFee', 'fee', 'price', 'ticketType', 'startDate', 'endDate', 'venue', 'capacity']));
  }
  return result;
}
export const publicEvent = (source = {}) => ({ ...pickScalars(source, EVENT_FIELDS), ...publicCollections(source) });
export const publicEventConfig = (source = {}) => ({ ...pickScalars(source, CONFIG_FIELDS), ...publicCollections(source) });

// Browsers revalidate; the CDN may serve a 15-second cached response and refresh for
// another 15 seconds. Origin caches add at most their own documented TTL. Checkout
// always re-reads server-side prices/capacity; cached catalog data is presentation only.
export function publicCatalogHeaders(req, res) {
  if (req.headers?.authorization || req.query?.token) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15');
}
