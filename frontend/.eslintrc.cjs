module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "import",
    "simple-import-sort",
  ],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "react/react-in-jsx-scope": "off", // Not needed in React 17+
    "react/prop-types": "off", // We use TS, not PropTypes
    "@typescript-eslint/no-explicit-any": "warn",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/order": [
      "error",
      {
        groups: [
          ["builtin", "external"],
          ["internal"],
          ["parent", "sibling", "index"],
        ],
        "newlines-between": "always",
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};