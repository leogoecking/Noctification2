module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ]
  },
  ignorePatterns: ["node_modules/", "dist/", "coverage/", "apps/api/data/"],
  overrides: [
    {
      files: ["apps/api/**/*.ts"],
      env: {
        node: true,
        browser: false
      }
    },
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      env: {
        browser: true,
        node: false
      }
    },
    {
      files: ["**/*.test.ts", "**/*.spec.ts"],
      env: {
        node: true
      }
    }
  ]
};