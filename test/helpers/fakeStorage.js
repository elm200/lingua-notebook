/**
 * Web標準Storageの最小実装。node:test環境にはlocalStorageが無いため、
 * db.js/languages.js等の`storage`引数へ注入して使う。
 * @implements {Storage}
 */
export class FakeStorage {
  #map = new Map();

  get length() {
    return this.#map.size;
  }

  /** @param {string} key */
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }

  /** @param {string} key @param {string} value */
  setItem(key, value) {
    this.#map.set(key, String(value));
  }

  /** @param {string} key */
  removeItem(key) {
    this.#map.delete(key);
  }

  clear() {
    this.#map.clear();
  }

  /** @param {number} index */
  key(index) {
    return Array.from(this.#map.keys())[index] ?? null;
  }
}
