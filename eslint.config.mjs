// eslint.config.mjs
import { fileURLToPath } from "url";
import path from "path";
import tsParser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";
import unusedImports from "eslint-plugin-unused-imports";

const isProd = process.env.CI === "true" || process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 0) Global ignores (truly never lint these)
const GLOBAL_IGNORES = [
  "**/node_modules/**",
  "**/.pnpm/**",
  "**/dist/**",
  "**/build/**",
  ".next/**",
  "coverage/**",
  // generated/third-party
  "src/components/ui/**",
  "src/lib/supabase.types.ts",
  "supabase/functions/**",
  // configs not in tsconfig project
  "vitest.config.ts",
  "vitest.setup.ts",
  "playwright.config.*",
  "tailwind.config.*",
  // e2e and run directories
  "e2e/**",
  "run/**",
];

export default [
  // 0) Apply global ignores first
  { ignores: GLOBAL_IGNORES },

  // 1) Fast, non-typed pass across repo
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unusedImports,
      "@next/next": nextPlugin,
    },
    languageOptions: { parser: tsParser }, // no project => cheap
    rules: {
      // debt prevention (still cheap)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true, "ts-nocheck": true, "ts-check": true },
      ],
      // Next hints
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
      // console policy
      "no-console": isProd ? ["error", { allow: ["warn", "error"] }] : "off",
    },
  },

  // 2) Typed, expensive rules ONLY on app/server source (not tests)
  {
    files: ["src/server/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}", "packages/repo/src/**/*.ts"],
    // These are the only files that are type-checked by ESLint
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.join(__dirname, "tsconfig.json"),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
    },
  },

  // 3) API routes: Enforce new standardized patterns, ban legacy patterns
  {
    files: ["src/app/api/**/route.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.join(__dirname, "tsconfig.json"),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Ban legacy patterns and enforce standardized API handlers
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/server",
              importNames: ["NextResponse", "NextRequest"],
              message:
                "Use standardized API handlers from '@/lib/api' or '@/lib/api-edge-cases' instead of NextResponse/NextRequest. See migration guide in memories.",
            },
          ],
          patterns: [
            {
              group: ["@omnicrm/contracts", "@omnicrm/contracts/**"],
              message: "Removed. Use '@/server/db/business-schemas' for validation schemas.",
            },
            {
              group: ["@/lib/validation/schemas", "@/lib/validation/schemas/**"],
              message: "Removed. Use '@/server/db/business-schemas' for validation schemas.",
            },
            {
              group: ["**/packages/contracts/**"],
              message: "Removed. Use '@/server/db/business-schemas' for validation schemas.",
            },
            {
              group: ["@/server/utils/api-helpers", "@/server/utils/api-helpers/**"],
              message:
                "Legacy API helpers removed. Use '@/lib/api' or '@/lib/api-edge-cases' handlers.",
            },
            {
              group: ["@/lib/api-client", "@/lib/api-client/**"],
              message: "Legacy API client removed. Use '@/lib/api' handlers.",
            },
            {
              group: ["@/lib/api-request", "@/lib/api-request/**"],
              message: "Legacy API request removed. Use '@/lib/api' handlers.",
            },
          ],
        },
      ],

      // Ban legacy syntax patterns
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='NextResponse'][callee.property.name='json']",
          message:
            "Use standardized API handlers (handle, handleAuth, handleGetWithQueryAuth) from '@/lib/api' instead of NextResponse.json(). This ensures consistent error handling and validation.",
        },
        {
          selector:
            "FunctionDeclaration[params.0.typeAnnotation.typeAnnotation.typeName.name='NextRequest']",
          message:
            "Use standardized API handlers from '@/lib/api' or '@/lib/api-edge-cases' instead of manual NextRequest handling. This ensures type safety and consistent patterns.",
        },
        {
          selector:
            "ArrowFunctionExpression[params.0.typeAnnotation.typeAnnotation.typeName.name='NextRequest']",
          message:
            "Use standardized API handlers from '@/lib/api' or '@/lib/api-edge-cases' instead of manual NextRequest handling.",
        },
        {
          selector: "NewExpression[callee.name='Response']",
          message:
            "Use standardized API handlers from '@/lib/api' that return proper Response objects with consistent error handling.",
        },
      ],

      // Require proper imports for API routes
      "no-restricted-globals": [
        "error",
        {
          name: "NextResponse",
          message:
            "Import standardized handlers from '@/lib/api' or '@/lib/api-edge-cases' instead.",
        },
      ],

      // Ensure API routes use proper patterns
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: false,
        },
      ],
    },
  },

  // 4) Tests: explicitly turn off unsafe rules that mocks trigger
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**", "**/_tests_/**"],
    languageOptions: { parser: tsParser }, // non-typed parsing is enough
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },

  // 5) TypeScript declaration files: allow explicit any
  {
    files: ["**/*.d.ts"],
    languageOptions: { parser: tsParser },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // 6) Testing packages: allow explicit any and unused vars
  {
    files: ["packages/testing/**/*.ts"],
    languageOptions: { parser: tsParser },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
