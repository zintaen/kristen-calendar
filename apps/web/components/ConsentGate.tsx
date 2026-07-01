"use client";

import React, { useEffect, useState } from "react";
import { consentStore, ConsentFlags } from "../lib/consent-store";
import { ConsentModal } from "./ConsentModal";
import { CONSENT_POLICY_VERSION } from "../../../services/genie-api/lib/consent";

export const ConsentGate: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const flags = consentStore.getFlags();
    // Prompt if they haven't explicitly consented to this version
    if (!flags.consentedAt || flags.policyVersion !== CONSENT_POLICY_VERSION) {
      setShowModal(true);
    }
  }, []);

  const handleAccept = async (newFlags: Partial<ConsentFlags>) => {
    for (const [key, value] of Object.entries(newFlags)) {
      if (typeof value === "boolean") {
        await consentStore.setFlag(key as any, value);
      }
    }
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <ConsentModal 
      onAccept={handleAccept}
      onDismiss={() => setShowModal(false)}
      policyVersion={CONSENT_POLICY_VERSION}
    />
  );
};
