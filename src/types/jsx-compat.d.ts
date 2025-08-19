// Temporary compatibility shim to support code using global `JSX` with React 19 types
// Maps the global JSX namespace to React.JSX so existing annotations like `: JSX.Element`
// continue to work.
import type * as React from "react";

declare global {
  namespace JSX {
    // Elements and intrinsic elements
    type Element = React.JSX.Element;
    type IntrinsicElements = React.JSX.IntrinsicElements;

    // Attribute inference helpers
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}

export {};
