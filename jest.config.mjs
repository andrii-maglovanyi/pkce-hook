/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/*.test.{ts,tsx}"],
  setupFilesAfterEnv: ["./setup-tests.js"],
};
