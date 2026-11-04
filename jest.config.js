/** Pruebas de la capa Node que carga y valida los scripts SQL (la cobertura aplica a src/ y bin/). */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  collectCoverageFrom: ["src/**/*.js", "bin/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text", "text-summary"],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
