/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(...classNames: string[]): R;
      toHaveValue(value: string | number | string[]): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveFocus(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    }
  }

  // Browser API globals for test environment - ensure no 'no-undef' errors
  interface Window {
    location: Location;
    navigator: Navigator;
    localStorage: Storage;
    sessionStorage: Storage;
    fetch: typeof fetch;
    URL: typeof URL;
    URLSearchParams: typeof URLSearchParams;
    FormData: typeof FormData;
    Request: typeof Request;
    Response: typeof Response;
    Headers: typeof Headers;
    console: Console;
  }

  interface Location {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
    assign(url: string): void;
    replace(url: string): void;
    reload(): void;
  }

  // Declare browser globals that might be used in tests or components
  const window: Window;
  const document: Document;
  const navigator: Navigator;
  const localStorage: Storage;
  const sessionStorage: Storage;
  const fetch: typeof globalThis.fetch;
  const URL: typeof globalThis.URL;
  const URLSearchParams: typeof globalThis.URLSearchParams;
  const FormData: typeof globalThis.FormData;
  const Request: typeof globalThis.Request;
  const Response: typeof globalThis.Response;
  const Headers: typeof globalThis.Headers;
  const console: Console;
  const setTimeout: typeof globalThis.setTimeout;
  const clearTimeout: typeof globalThis.clearTimeout;
  const setInterval: typeof globalThis.setInterval;
  const clearInterval: typeof globalThis.clearInterval;
}

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
    toHaveAttribute(attr: string, value?: string): T;
    toHaveClass(...classNames: string[]): T;
    toHaveValue(value: string | number | string[]): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toHaveFocus(): T;
    toBeVisible(): T;
    toBeChecked(): T;
    toHaveTextContent(text: string | RegExp): T;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
  }
}
