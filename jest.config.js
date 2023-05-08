/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["./setup-tests.js"],
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
};
