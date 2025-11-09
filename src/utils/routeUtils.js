const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 45;
const DEFAULT_SEGMENT_COLOR = '#1976d2';

const toRadians = (deg) => (deg * Math.PI) / 180;

export const haversineDistance = (coordsA, coordsB) => {
  const [lat1, lon1] = coordsA;
  const [lat2, lon2] = coordsB;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

export const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export const formatDuration = (minutes) => {
  if (minutes < 1) return '< 1 phut';
  if (minutes < 60) return `${Math.round(minutes)} phut`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours} gio` : `${hours} gio ${mins} phut`;
};

const convertGeoJsonCoords = (coords = []) =>
  coords.map(([lon, lat]) => [lat, lon]);

const mergeStepsGeometry = (steps = []) => {
  const merged = [];
  steps.forEach((step, index) => {
    const coords = convertGeoJsonCoords(step.geometry?.coordinates ?? []);
    if (!coords.length) return;
    if (index === 0) {
      merged.push(...coords);
    } else {
      merged.push(...coords.slice(1));
    }
  });
  return merged;
};

const deriveSegmentGeometry = (leg, fallbackGeometry) => {
  if (!leg) return fallbackGeometry;
  if (leg.steps?.length) {
    const coords = mergeStepsGeometry(leg.steps);
    if (coords.length) return coords;
  }
  if (leg.geometry?.coordinates?.length) {
    const coords = convertGeoJsonCoords(leg.geometry.coordinates);
    if (coords.length) return coords;
  }
  return fallbackGeometry;
};

const baseSegmentData = ({ from, to, fromId, toId }) => ({
  id: `${fromId}-${toId}`,
  from,
  to,
  color: DEFAULT_SEGMENT_COLOR,
});

export const buildSegmentsFromLegs = ({
  legs = [],
  routeStopIds,
  stopById,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  return routeStopIds.slice(0, -1).map((fromId, index) => {
    const toId = routeStopIds[index + 1];
    const from = stopById[fromId];
    const to = stopById[toId];
    const leg = legs[index];

    const distanceKm = leg?.distance ? leg.distance / 1000 : haversineDistance(from.position, to.position);
    const durationMinutes = leg?.duration
      ? leg.duration / 60
      : (distanceKm / DEFAULT_SPEED_KMH) * 60;

    return {
      ...baseSegmentData({ from, to, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: deriveSegmentGeometry(leg, [from.position, to.position]),
    };
  });
};

export const buildFallbackSegments = ({
  routeStopIds,
  stopById,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  return routeStopIds.slice(0, -1).map((fromId, index) => {
    const toId = routeStopIds[index + 1];
    const from = stopById[fromId];
    const to = stopById[toId];

    const distanceKm = haversineDistance(from.position, to.position);
    const durationMinutes = (distanceKm / DEFAULT_SPEED_KMH) * 60;

    return {
      ...baseSegmentData({ from, to, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: [from.position, to.position],
    };
  });
};

export const getRouteTotals = (segments) =>
  segments.reduce(
    (acc, segment) => ({
      distanceKm: acc.distanceKm + segment.distanceKm,
      durationMinutes: acc.durationMinutes + segment.durationMinutes,
    }),
    { distanceKm: 0, durationMinutes: 0 },
  );

export const convertRouteCoordinates = (route) =>
  convertGeoJsonCoords(route?.geometry?.coordinates ?? []);

const normalizeModifier = (modifier) =>
  (modifier ?? '').toLowerCase().replace(/\s+/g, '_');

const MANEUVER_MODIFIER_TEXT = {
  left: 're trai',
  right: 're phai',
  straight: 'di thang',
  slight_left: 're nhe trai',
  slight_right: 're nhe phai',
  sharp_left: 're gap trai',
  sharp_right: 're gap phai',
  uturn: 'quay dau',
};

const MANEUVER_TYPE_TEXT = {
  merge: 'nhap lan',
  fork: 'di theo nhanh',
  'end of road': 'het duong, re',
  'new name': 'tiep tuc',
  continue: 'di thang',
  'on ramp': 'len cao toc',
  'off ramp': 'ra khoi cao toc',
};

const buildActionText = (type, modifier, exit) => {
  const normalizedModifier = normalizeModifier(modifier);
  const normalizedType = normalizeModifier(type);

  if (normalizedType === 'roundabout' || normalizedType === 'roundabout_turn') {
    if (exit) {
      return `vao vong xuyen, ra o cua ${exit}`;
    }
    return 'vao vong xuyen';
  }

  if (type === 'depart') return 'khoi hanh';
  if (type === 'arrive') return 'den dich';

  if (MANEUVER_MODIFIER_TEXT[normalizedModifier]) {
    return MANEUVER_MODIFIER_TEXT[normalizedModifier];
  }

  if (MANEUVER_TYPE_TEXT[type]) {
    return MANEUVER_TYPE_TEXT[type];
  }

  return 'di tiep';
};

const determineStepSymbol = (type, modifier) => {
  const normalizedModifier = normalizeModifier(modifier);
  const normalizedType = normalizeModifier(type);

  if (normalizedType === 'depart') return 'depart';
  if (normalizedType === 'arrive') return 'arrive';

  if (normalizedModifier === 'slight_left') return 'slight_left';
  if (normalizedModifier === 'slight_right') return 'slight_right';
  if (normalizedModifier === 'sharp_left') return 'sharp_left';
  if (normalizedModifier === 'sharp_right') return 'sharp_right';
  if (normalizedModifier === 'left') return 'left';
  if (normalizedModifier === 'right') return 'right';
  if (normalizedModifier === 'straight' || normalizedType === 'continue') return 'straight';

  if (normalizedModifier === 'uturn' || normalizedModifier === 'u_turn') {
    if (modifier && modifier.toLowerCase().includes('right')) {
      return 'uturn_right';
    }
    return 'uturn_left';
  }
  if (normalizedModifier === 'uturn_left') return 'uturn_left';
  if (normalizedModifier === 'uturn_right') return 'uturn_right';

  if (normalizedType === 'merge' || normalizedType === 'on_ramp') return 'merge';
  if (normalizedType === 'fork' || normalizedType === 'off_ramp') return 'fork';
  if (normalizedType === 'roundabout' || normalizedType === 'roundabout_turn') return 'roundabout';

  return 'default';
};

const buildStepDescription = ({
  step,
  fromStop,
  toStop,
}) => {
  const type = step?.maneuver?.type ?? '';
  const modifier = step?.maneuver?.modifier;
  const exit = step?.maneuver?.exit;
  const streetName = step?.name?.trim();
  const distanceMeters = typeof step?.distance === 'number' ? step.distance : 0;
  const distanceText =
    distanceMeters > 0 ? formatDistance(distanceMeters / 1000) : null;
  const action = buildActionText(type, modifier, exit);
  const symbol = determineStepSymbol(type, modifier);

  if (type === 'depart') {
    const origin = fromStop?.name ?? streetName ?? 'diem khoi hanh';
    return {
      text: `Khoi hanh tu ${origin}`,
      distanceText: null,
      kind: 'depart',
      symbol,
    };
  }

  if (type === 'arrive') {
    const destination = toStop?.name ?? streetName ?? 'dich';
    return {
      text: `Den ${destination}`,
      distanceText: null,
      kind: 'arrive',
      symbol,
    };
  }

  const prefix = distanceText ? `Phia truoc ${distanceText}` : 'Thuc hien';

  let suffix = '';
  if (streetName) {
    if (action.startsWith('vao') || action.startsWith('nhap')) {
      suffix = ` ${streetName}`;
    } else if (action.startsWith('di thang')) {
      suffix = ` tren ${streetName}`;
    } else if (action.startsWith('quay dau')) {
      suffix = '';
    } else {
      suffix = ` vao ${streetName}`;
    }
  }

  return {
    text: `${prefix} ${action}${suffix}`.replace(/\s+/g, ' ').trim(),
    distanceText,
    kind: 'maneuver',
    symbol,
  };
};

export const buildTurnInstructions = ({
  legs = [],
  routeStopIds = [],
  stopById = {},
}) => {
  const instructions = [];

  legs.forEach((leg, legIndex) => {
    const steps = leg?.steps ?? [];
    const fromStop = stopById[routeStopIds[legIndex]];
    const toStop = stopById[routeStopIds[legIndex + 1]];

    steps.forEach((step, stepIndex) => {
      const description = buildStepDescription({
        step,
        fromStop,
        toStop,
      });

      instructions.push({
        id: `step-${legIndex}-${stepIndex}`,
        ...description,
      });
    });
  });

  return instructions;
};
