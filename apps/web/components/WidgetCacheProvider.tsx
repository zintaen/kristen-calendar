"use client";

import { useEffect } from "react";
import { registerWidgetCacheWriter, writeWidgetCache } from "../lib/widget-cache-writer";

export function WidgetCacheProvider() {
  useEffect(() => {
    // Write cache once on mount
    writeWidgetCache().catch(console.error);
    // Register background listeners
    registerWidgetCacheWriter();
  }, []);

  return null;
}
