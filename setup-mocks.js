const crypto = require("crypto");
const { TextEncoder } = require("util");

const setupMocks = () => {
  global.TextEncoder = TextEncoder;

  Object.defineProperty(window, "location", {
    value: {
      hostname: "",
      replace: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, "history", {
    value: {
      pushState: () => {},
    },
  });

  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: async (bytes) => crypto.randomBytes(bytes.length),
      subtle: {
        async digest(algorithm, data) {
          const encoder = new TextEncoder();
          const message = encoder.encode(data);
          const buffer = await crypto.subtle.digest(algorithm, message);
          return buffer;
        },
      },
    },
  });
};

module.exports = { setupMocks };
