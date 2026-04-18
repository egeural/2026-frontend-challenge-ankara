const KEY_A = import.meta.env.VITE_API_KEY_A;
const KEY_B = import.meta.env.VITE_API_KEY_B;

export const FORMS = {
  checkins:  { id: '261065067494966', label: 'Check-in',      key: KEY_A, color: '#4f8ef7' },
  messages:  { id: '261065765723966', label: 'Message',       key: KEY_A, color: '#a78bfa' },
  sightings: { id: '261065244786967', label: 'Sighting',      key: KEY_B, color: '#34d399' },
  notes:     { id: '261065509008958', label: 'Personal Note', key: KEY_B, color: '#6ee7b7' },
  tips:      { id: '261065875889981', label: 'Anon Tip',      key: KEY_B, color: '#f87171' },
};

export const LEVEL_COLORS = {
  low:    '#68d391',
  medium: '#f6c90e',
  high:   '#fc8181',
};
