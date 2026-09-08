"use client";

// The safety pathway (PRD §49): what renders when a reflection matched a safety rule. It replaces
// whatever was on the screen, carries no progress, no score and no next module, and says who to
// call. One control: "I have read this", which lets the person continue when they choose to.

import { Phone } from "@phosphor-icons/react";
import { safetyRule, type SafetyRuleId } from "@/model/safety";

export function SafetyScreen({ ruleId, onAcknowledge }: { ruleId: SafetyRuleId; onAcknowledge: () => void }) {
  const rule = safetyRule(ruleId);
  return (
    <section className="safety-screen" role="alertdialog" aria-labelledby="safety-title" aria-describedby="safety-body">
      <p className="learn-card-eyebrow">Before anything else</p>
      <h2 id="safety-title" className="learn-card-heading">{rule.message}</h2>
      <p id="safety-body" className="learn-card-body">{rule.recommendedAction}</p>
      <p className="safety-note">
        <Phone size={16} weight="bold" aria-hidden="true" />
        This app is not an emergency service and cannot judge how you are. A person can.
      </p>
      <p className="safety-note">Nothing you wrote leaves this device. Ordinary suggestions are paused until you continue.</p>
      <button type="button" className="learn-primary" onClick={onAcknowledge}>I have read this</button>
    </section>
  );
}
