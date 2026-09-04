"use client";

import { configureApiBase } from "@/lib/api";

/**
 * Bridges a server-read runtime env var into the client bundle without
 * requiring it at Docker build time. Rendered once at the root of the tree;
 * the assignment happens synchronously during render, before any child
 * component's effects (including data fetching) run.
 */
export function ApiBaseSetter({ apiBase }: { apiBase: string }) {
  configureApiBase(apiBase);
  return null;
}
