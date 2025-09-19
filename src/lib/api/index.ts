// Re-export main API client functionality
export * from "./client";
export * from "./types";

// Import functions from client for re-export with legacy names
import { get, post, put, patch, del } from "./client";

// Legacy aliases for backward compatibility
export const fetchGet = get;
export const fetchPost = post;
export const fetchPut = put;
export const fetchPatch = patch;
export const fetchDelete = del;