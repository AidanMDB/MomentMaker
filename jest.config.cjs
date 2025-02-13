module.exports = {
    preset: "ts-jest", // Enables TypeScript support
    testEnvironment: "node", // Runs tests in a Node.js environment (ideal for Amplify backend)
    
    // Automatically find test files (supports .test.ts and .spec.ts)
    testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  
    // Enable detailed test coverage reports
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: ["json", "lcov", "text", "clover"],
  
    // Define which files to include in coverage
    collectCoverageFrom: [
      "amplify/**/*.ts", // Include all TypeScript files in Amplify backend
      "src/**/*.ts", 
      "!**/node_modules/**",
      "!**/vendor/**"
    ],
  
    // Clear mock calls & instances before each test
    clearMocks: true,
  
    // Mock Amplify backend to prevent real AWS calls during tests
    // moduleNameMapper: {
    //   "@aws-amplify/backend": "<rootDir>/__mocks__/amplify-backend.js",
    // },
  
    // Allow using ESM modules if needed
    extensionsToTreatAsEsm: [".ts"],
  
    // Increase timeout for backend-related tests
    testTimeout: 10000,
  };
  