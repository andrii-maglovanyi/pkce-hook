export type DefaultType = Record<string, unknown>;

const get = <T extends DefaultType>(key: string): T | null => {
  const value = localStorage.getItem(key);
  return value && JSON.parse(value);
};

const set = (key: string, value: DefaultType) => {
  const originalValueString = localStorage.getItem(key);
  if (originalValueString) {
    const originalValue = JSON.parse(originalValueString);
    localStorage.setItem(key, JSON.stringify({ ...originalValue, ...value }));
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const remove = (key: string) => localStorage.removeItem(key);

export const Storage = {
  get,
  remove,
  set,
};
