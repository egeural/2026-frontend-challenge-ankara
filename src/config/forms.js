const KEY_A = import.meta.env.VITE_API_KEY_A;
const KEY_B = import.meta.env.VITE_API_KEY_B;

export const FORMS = {
  checkins:  { id: '261065067494966', label: 'Check-in',      key: KEY_A, color: '#0099FF' },
  messages:  { id: '261065765723966', label: 'Message',       key: KEY_A, color: '#FFB629' },
  sightings: { id: '261065244786967', label: 'Sighting',      key: KEY_B, color: '#FF6100' },
  notes:     { id: '261065509008958', label: 'Personal Note', key: KEY_B, color: '#00c8ff' },
  tips:      { id: '261065875889981', label: 'Anon Tip',      key: KEY_B, color: '#ff3300' },
};

export const LEVEL_COLORS = {
  low:    '#68d391',
  medium: '#f6c90e',
  high:   '#fc8181',
};
