// js/cache.js
// sessionStorage helpers — saves Gemini responses so we never re-call API

const Cache = {
  save(key, data) {
    sessionStorage.setItem(key, JSON.stringify(data));
  },

  load(key) {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },

  exists(key) {
    return sessionStorage.getItem(key) !== null;
  },

  clear(key) {
    sessionStorage.removeItem(key);
  }
};
