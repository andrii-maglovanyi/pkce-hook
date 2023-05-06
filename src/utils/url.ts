const removeQueryString = () => {
  const url = new URL(window.location.href);

  url.search = "";
  const newUrl = url.toString();

  window.history?.pushState({ path: newUrl }, "", newUrl);
};

const parseQueryString = () => {
  const params = new URLSearchParams(window.location.search);

  return Object.fromEntries(params.entries());
};

export const Url = {
  parseQueryString,
  removeQueryString,
};
