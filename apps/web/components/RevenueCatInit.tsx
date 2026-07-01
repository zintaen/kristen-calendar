"use client";

import { useEffect } from "react";
import { IAPService } from "../lib/monetization/IAPService";

export function RevenueCatInit() {
  useEffect(() => {
    IAPService.init();
  }, []);

  return null;
}
