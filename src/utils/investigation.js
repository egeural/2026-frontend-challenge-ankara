import { parseTimestamp } from './events.js';

const OVERLAP_WINDOW_MS = 30 * 60 * 1000;
const UNKNOWN_NAMES = new Set(['unknown', 'anonymous', 'anon', 'n/a', 'na', '-', '—', '?']);
const BASE_WEIGHTS = {
  checkins: 2,
  messages: 1,
  sightings: 3,
  notes: 1,
  tips: 2,
};
const LEVEL_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
};

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
}

function isPodo(name) {
  return normalizeName(name).includes('podo');
}

function isUnknown(name) {
  return UNKNOWN_NAMES.has(normalizeName(name));
}

function listFromValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(listFromValue);
  return String(value)
    .split(/,|;|&|\band\b|\//gi)
    .map(part => part.trim())
    .filter(Boolean);
}

function uniqueByNormalize(names) {
  const seen = new Set();
  const out = [];

  names.forEach(name => {
    const clean = String(name || '').trim().replace(/\s+/g, ' ');
    const key = normalizeName(clean);
    if (!clean || seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  });

  return out;
}

function collectPeople(slug, data) {
  if (slug === 'checkins') return uniqueByNormalize([data.personName]);
  if (slug === 'messages') return uniqueByNormalize([data.senderName, data.recipientName]);
  if (slug === 'sightings') return uniqueByNormalize([data.personName, data.seenWith]);
  if (slug === 'notes') return uniqueByNormalize([data.authorName, ...listFromValue(data.mentionedPeople)]);
  if (slug === 'tips') return uniqueByNormalize([data.suspectName]);
  return [];
}

function flattenValue(value) {
  if (Array.isArray(value)) return value.map(flattenValue).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(flattenValue).join(' ');
  return String(value || '');
}

function minutesBetween(a, b) {
  return Math.round(Math.abs(a - b) / 60000);
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function buildEventRecords(cache) {
  const events = [];

  Object.entries(cache || {}).forEach(([slug, rows]) => {
    (rows || []).forEach(data => {
      const people = collectPeople(slug, data);
      const rawText = flattenValue(data).toLocaleLowerCase('tr-TR');
      const timestamp = parseTimestamp(data.timestamp || data._created || '');
      const level = (data.urgency || data.confidence || '').toLocaleLowerCase('tr-TR');

      events.push({
        slug,
        data,
        rawText,
        people,
        peopleKeys: new Set(people.map(normalizeName)),
        timestamp,
        location: String(data.location || '').trim(),
        level,
        isPodoRelated: people.some(isPodo) || rawText.includes('podo'),
      });
    });
  });

  return events;
}

function calculateAnalysis(candidate, events, podoEvents, cutoff) {
  const key = normalizeName(candidate);
  const relatedEvents = events.filter(event => event.peopleKeys.has(key));
  const relatedLocations = [...new Set(relatedEvents.map(event => event.location).filter(Boolean))];
  const connections = new Set();
  let baseScore = 0;
  let sightingsWithPodo = 0;
  let strongTips = 0;

  relatedEvents.forEach(event => {
    baseScore += BASE_WEIGHTS[event.slug] || 0;

    if (event.slug === 'tips') {
      strongTips += LEVEL_WEIGHTS[event.level] || 0;
      baseScore += (LEVEL_WEIGHTS[event.level] || 1) * 2;
    }

    if (event.slug === 'messages') {
      baseScore += LEVEL_WEIGHTS[event.level] || 0;
    }

    if (event.isPodoRelated) {
      baseScore += 2;
      if (event.slug === 'sightings') sightingsWithPodo += 1;
    }

    event.people.forEach(name => {
      if (normalizeName(name) !== key && !isPodo(name) && !isUnknown(name)) {
        connections.add(name);
      }
    });
  });

  const overlaps = relatedEvents.filter(event =>
    event.timestamp && podoEvents.some(podoEvent =>
      podoEvent.timestamp && Math.abs(podoEvent.timestamp - event.timestamp) <= OVERLAP_WINDOW_MS
    )
  ).length;

  const lastSeenBeforeCutoff = relatedEvents
    .filter(event => event.timestamp && (!cutoff || event.timestamp <= cutoff))
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const lastSeenGapMinutes = cutoff && lastSeenBeforeCutoff
    ? minutesBetween(cutoff, lastSeenBeforeCutoff.timestamp)
    : null;

  const scoreRaw = baseScore + overlaps * 2 + relatedLocations.length + connections.size + sightingsWithPodo * 2 + strongTips;

  return {
    name: candidate,
    key,
    relatedEvents,
    relatedCount: relatedEvents.length,
    locations: relatedLocations,
    locationsCount: relatedLocations.length,
    connections: [...connections],
    connectionsCount: connections.size,
    sightingsWithPodo,
    overlaps,
    lastSeenGapMinutes,
    strongTips,
    scoreRaw,
  };
}

function buildSummary(analysis) {
  const lines = [];

  if (analysis.sightingsWithPodo) {
    lines.push(`${analysis.name} appears in ${pluralize(analysis.sightingsWithPodo, 'Podo-linked sighting')}`);
  }

  if (analysis.relatedCount) {
    lines.push(`${pluralize(analysis.relatedCount, 'evidence point')} mention or place ${analysis.name} in the case`);
  }

  if (analysis.lastSeenGapMinutes != null) {
    lines.push(`last seen ${pluralize(analysis.lastSeenGapMinutes, 'minute')} before Podo vanishes from the timeline`);
  }

  if (analysis.locationsCount) {
    lines.push(`connected across ${pluralize(analysis.locationsCount, 'location')}`);
  }

  return lines.length ? `${lines.join(', ')}.` : `There is only weak evidence tying ${analysis.name} to Podo's disappearance.`;
}

export function buildInvestigationGame(cache) {
  const events = buildEventRecords(cache);
  const podoEvents = events.filter(event => event.isPodoRelated);
  const cutoff = podoEvents.reduce((latest, event) => Math.max(latest, event.timestamp || 0), 0) || null;

  const candidates = uniqueByNormalize(
    events.flatMap(event => event.people)
  ).filter(name => !isPodo(name) && !isUnknown(name));

  const analyses = candidates
    .map(candidate => calculateAnalysis(candidate, events, podoEvents, cutoff))
    .filter(analysis => analysis.relatedCount > 0)
    .sort((a, b) =>
      b.scoreRaw - a.scoreRaw ||
      b.sightingsWithPodo - a.sightingsWithPodo ||
      b.overlaps - a.overlaps ||
      a.name.localeCompare(b.name, 'tr')
    );

  if (!analyses.length) {
    return {
      suspects: [],
      allAnalyses: [],
      topSuspect: null,
      podoEventCount: podoEvents.length,
    };
  }

  const maxScore = analyses[0].scoreRaw || 1;
  analyses.forEach(analysis => {
    analysis.score = Math.min(99, Math.max(9, Math.round((analysis.scoreRaw / (maxScore * 1.15)) * 100)));
    analysis.summary = buildSummary(analysis);
  });

  return {
    suspects: analyses
      .slice(0, 4)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    allAnalyses: analyses,
    topSuspect: analyses[0],
    podoEventCount: podoEvents.length,
  };
}
