export const state = {
  cache: {},       // slug → Row[]
  markerRefs: {},  // `${slug}-${_id}` → { marker, coords }
  map: null,
  mapReady: false,
};
