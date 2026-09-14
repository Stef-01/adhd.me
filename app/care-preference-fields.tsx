"use client";
import { CARE_NEEDS, IDENTITY_LABELS, type CarePreferences, type CareNeed, type ClinicianIdentityPreference } from "@/support/care-preferences";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function CarePreferenceFields({ value, onChange }: { value: CarePreferences; onChange: (next: CarePreferences) => void }) {
  const needs = value.careNeeds ?? [];
  return <details className="me-group me-fold care-preferences">
    <summary>Care and cultural preferences</summary>
    <div className="care-preference-fields">
      <label htmlFor="care-clinician-identity">Clinician identity</label>
      <NativeSelect id="care-clinician-identity" value={value.clinicianIdentity ?? "any"} onChange={e => onChange({ clinicianIdentity: e.target.value as ClinicianIdentityPreference })}>
        {Object.entries(IDENTITY_LABELS).map(([key, label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}
      </NativeSelect>
      <label htmlFor="care-country">Country or Nation <span>(optional)</span></label>
      <input id="care-country" value={value.country ?? ""} maxLength={120} placeholder="As shared by the clinician" onChange={e => onChange({ country: e.target.value })} />
      <label htmlFor="care-needs">Support alongside ADHD</label>
      <NativeSelect id="care-needs" value="" onChange={e => { if (e.target.value) onChange({ careNeeds: [...needs, e.target.value as CareNeed] }); }}>
        <NativeSelectOption value="">Add a care need</NativeSelectOption>
        {Object.entries(CARE_NEEDS).filter(([key]) => !needs.includes(key as CareNeed)).map(([key, label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}
      </NativeSelect>
      {needs.length > 0 && <ul className="me-chips" aria-label="Selected care needs">{needs.map(need => <li key={need}><button type="button" className="me-chip is-on" aria-label={`Remove ${CARE_NEEDS[need]}`} onClick={() => onChange({ careNeeds: needs.filter(n => n !== need) })}>{CARE_NEEDS[need]} <span aria-hidden="true">×</span></button></li>)}</ul>}
      <p className="me-group-note">Matches use declared care and identity. Country is not the clinic location.</p>
      <a href="https://www.naccho.org.au/location/" target="_blank" rel="noopener noreferrer">Find a community-controlled health service ↗</a>
    </div>
  </details>;
}
