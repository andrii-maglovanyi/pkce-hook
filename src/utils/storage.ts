export type DefaultType = Record<string, unknown>;

const isLocalStorageAvailable = () => typeof window !== "undefined";

const get = <T extends DefaultType>(key: string): T | null => {
  if (!isLocalStorageAvailable()) return null;

  const value = localStorage.getItem(key);
  return value && JSON.parse(value);
};

const set = (key: string, value: DefaultType) => {
  if (!isLocalStorageAvailable()) return;

  const originalValueString = localStorage.getItem(key);
  if (originalValueString) {
    const originalValue = JSON.parse(originalValueString);
    localStorage.setItem(key, JSON.stringify({ ...originalValue, ...value }));
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const remove = (key: string) => {
  if (!isLocalStorageAvailable()) return;

  localStorage.removeItem(key);
};

export const Storage = {
  get,
  remove,
  set,
};
