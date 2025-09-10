import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.extends("prettier"),
  // Top-level ignores to keep noise down for tests/e2e scaffolding
  {
    ignores: [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.test.tsx",
      "**/*.spec.tsx",
      "**/__tests__/**",
      "**/_tests_/**",
      ".next/**",
      "e2e/**",
      "tests/**",
      // Ignore generated shadcn/ui components
      "src/components/ui/**",
    ],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.test.tsx",
      "**/*.spec.tsx",
      "**/__tests__/**",
      "**/_tests_/**",
      "e2e/**",
      "tests/**",
      // Ignore generated shadcn/ui components
      "src/components/ui/**",
      // ApiResponseBuilder needs to use new Response() internally
      "src/server/api/response.ts",
      // Auth/OAuth routes need NextResponse for redirects and cookies
      "src/app/api/auth/**/route.ts",
      "src/app/api/google/**/oauth/route.ts",
      "src/app/api/google/**/callback/route.ts",
      // Streaming routes need NextResponse for SSE
      "src/app/api/**/enrich/route.ts",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Node.js globals (for server-side code)
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      // Prefer style guidance without breaking the build
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "unused-imports/no-unused-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Enforce ApiResponseBuilder usage instead of raw Response.json or NextResponse.json
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='NextResponse'][callee.property.name='json']",
          message:
            "Use ApiResponseBuilder from @/server/api/response instead of NextResponse.json for consistent API responses.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Response'][callee.property.name='json']",
          message:
            "Use ApiResponseBuilder from @/server/api/response instead of raw Response.json for consistent API responses.",
        },
        {
          selector:
            "NewExpression[callee.name='Response']",
          message:
            "Use ApiResponseBuilder from @/server/api/response instead of new Response() for consistent API responses.",
        },
      ],
    },
  },
  // API routes should use ApiResponseBuilder pattern
  {
    files: ["src/app/api/**/*.ts"],
    ignores: [
      // Auth/OAuth routes need NextResponse for redirects and cookies  
      "src/app/api/auth/**/route.ts",
      "src/app/api/google/**/oauth/route.ts", 
      "src/app/api/google/**/callback/route.ts",
      // Streaming routes need NextResponse for SSE
      "src/app/api/**/enrich/route.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/server",
              importNames: ["NextResponse"],
              message: "API routes should use ApiResponseBuilder from @/server/api/response, not NextResponse.",
            },
          ],
        },
      ],
      // Enforce proper error handling pattern
      "no-restricted-syntax": [
        "error",
        {
          selector: "TryStatement:not(:has(CatchClause > BlockStatement > ExpressionStatement > CallExpression[callee.object.name='apiResponse'][callee.property.name='error']))",
          message: "Use apiResponse.error() for proper error handling in try-catch blocks.",
        },
      ],
    },
  },
  // Enforce createRouteHandler pattern for API routes
  {
    files: ["src/app/api/**/route.ts"],
    ignores: [
      // Auth/OAuth routes can use legacy patterns for redirects and cookies
      "src/app/api/auth/**/route.ts",
      "src/app/api/google/**/oauth/route.ts",
      "src/app/api/google/**/callback/route.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error", 
        {
          selector: "ExportNamedDeclaration[declaration.type='FunctionDeclaration'][declaration.id.name=/^(GET|POST|PUT|DELETE|PATCH)$/]:not(:has(CallExpression[callee.name='createRouteHandler']))",
          message: "API route handlers should use createRouteHandler() pattern from @/server/api/handler for consistent error handling and logging.",
        },
      ],
    },
  },
  // So unit tests can be pragmatic with types and unused params
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/server/db/schema.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];

export default eslintConfig;
