/**
 * Minimal FHIR R4 resource parser for Health Connect's Personal Health Records.
 * Converts FHIR resources into `clinical_records` rows. Best-effort: unknown
 * resource types fall through with the raw JSON preserved.
 */

export type ParsedClinical = {
  recordedAt: Date;
  category: string;
  kind: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  abnormalFlag: "low" | "high" | "critical" | null;
  source: string;
  raw: unknown;
};

type FhirCoding = { system?: string; code?: string; display?: string };
type FhirCodeableConcept = { coding?: FhirCoding[]; text?: string };
type FhirQuantity = { value?: number; unit?: string; code?: string; system?: string };
type FhirRange = { low?: FhirQuantity; high?: FhirQuantity };

type FhirObservation = {
  resourceType?: string;
  id?: string;
  code?: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  issued?: string;
  referenceRange?: Array<{ low?: FhirQuantity; high?: FhirQuantity } & Partial<FhirRange>>;
  interpretation?: FhirCodeableConcept[];
  performer?: Array<{ display?: string; reference?: string }>;
  meta?: { source?: string };
};

type FhirCondition = {
  resourceType?: string;
  id?: string;
  code?: FhirCodeableConcept;
  recordedDate?: string;
  onsetDateTime?: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  meta?: { source?: string };
};

type FhirMedicationRequest = {
  resourceType?: string;
  id?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  authoredOn?: string;
  status?: string;
  dosageInstruction?: Array<{ text?: string }>;
  meta?: { source?: string };
};

type FhirAllergyIntolerance = {
  resourceType?: string;
  id?: string;
  code?: FhirCodeableConcept;
  recordedDate?: string;
  criticality?: string;
  reaction?: Array<{ manifestation?: FhirCodeableConcept[]; severity?: string }>;
  meta?: { source?: string };
};

type FhirProcedure = {
  resourceType?: string;
  id?: string;
  code?: FhirCodeableConcept;
  performedDateTime?: string;
  performedPeriod?: { start?: string };
  status?: string;
  meta?: { source?: string };
};

type FhirImmunization = {
  resourceType?: string;
  id?: string;
  vaccineCode?: FhirCodeableConcept;
  occurrenceDateTime?: string;
  status?: string;
  meta?: { source?: string };
};

function codeText(c: FhirCodeableConcept | undefined): string | null {
  if (!c) return null;
  if (c.text) return c.text;
  return c.coding?.[0]?.display ?? c.coding?.[0]?.code ?? null;
}

function metaSource(r: { meta?: { source?: string } } | undefined): string {
  return r?.meta?.source ?? "Health Connect";
}

function interpretAbnormal(
  cc: FhirCodeableConcept[] | undefined,
): "low" | "high" | "critical" | null {
  const code = cc?.[0]?.coding?.[0]?.code?.toUpperCase();
  if (!code) return null;
  if (code === "L" || code === "LL") return "low";
  if (code === "H" || code === "HH") return "high";
  if (code === "C" || code === "A" || code === "AA") return "critical";
  return null;
}

function parseObservation(o: FhirObservation, category: string): ParsedClinical | null {
  const kind = codeText(o.code);
  if (!kind) return null;
  const recordedAtStr = o.effectiveDateTime ?? o.effectivePeriod?.start ?? o.issued;
  if (!recordedAtStr) return null;
  const recordedAt = new Date(recordedAtStr);
  if (isNaN(recordedAt.getTime())) return null;

  const valueNumeric = o.valueQuantity?.value ?? null;
  const unit = o.valueQuantity?.unit ?? null;
  const valueText =
    o.valueString ?? codeText(o.valueCodeableConcept) ?? null;
  const referenceLow = o.referenceRange?.[0]?.low?.value ?? null;
  const referenceHigh = o.referenceRange?.[0]?.high?.value ?? null;

  return {
    recordedAt,
    category,
    kind,
    valueNumeric,
    valueText: valueNumeric == null ? valueText : null,
    unit,
    referenceLow,
    referenceHigh,
    abnormalFlag: interpretAbnormal(o.interpretation),
    source: metaSource(o),
    raw: o,
  };
}

function parseCondition(c: FhirCondition): ParsedClinical | null {
  const kind = codeText(c.code);
  const recordedAtStr = c.recordedDate ?? c.onsetDateTime;
  if (!kind || !recordedAtStr) return null;
  const recordedAt = new Date(recordedAtStr);
  if (isNaN(recordedAt.getTime())) return null;
  const status = codeText(c.clinicalStatus);
  return {
    recordedAt,
    category: "conditions",
    kind,
    valueNumeric: null,
    valueText: status ?? null,
    unit: null,
    referenceLow: null,
    referenceHigh: null,
    abnormalFlag: null,
    source: metaSource(c),
    raw: c,
  };
}

function parseMedicationRequest(m: FhirMedicationRequest): ParsedClinical | null {
  const kind = codeText(m.medicationCodeableConcept);
  if (!kind || !m.authoredOn) return null;
  const recordedAt = new Date(m.authoredOn);
  if (isNaN(recordedAt.getTime())) return null;
  const dosage = m.dosageInstruction?.[0]?.text ?? m.status ?? null;
  return {
    recordedAt,
    category: "medications",
    kind,
    valueNumeric: null,
    valueText: dosage,
    unit: null,
    referenceLow: null,
    referenceHigh: null,
    abnormalFlag: null,
    source: metaSource(m),
    raw: m,
  };
}

function parseAllergyIntolerance(a: FhirAllergyIntolerance): ParsedClinical | null {
  const kind = codeText(a.code);
  if (!kind || !a.recordedDate) return null;
  const recordedAt = new Date(a.recordedDate);
  if (isNaN(recordedAt.getTime())) return null;
  return {
    recordedAt,
    category: "allergies_intolerances",
    kind,
    valueNumeric: null,
    valueText: a.criticality ?? null,
    unit: null,
    referenceLow: null,
    referenceHigh: null,
    abnormalFlag: a.criticality === "high" ? "high" : null,
    source: metaSource(a),
    raw: a,
  };
}

function parseProcedure(p: FhirProcedure): ParsedClinical | null {
  const kind = codeText(p.code);
  const recordedAtStr = p.performedDateTime ?? p.performedPeriod?.start;
  if (!kind || !recordedAtStr) return null;
  const recordedAt = new Date(recordedAtStr);
  if (isNaN(recordedAt.getTime())) return null;
  return {
    recordedAt,
    category: "procedures",
    kind,
    valueNumeric: null,
    valueText: p.status ?? null,
    unit: null,
    referenceLow: null,
    referenceHigh: null,
    abnormalFlag: null,
    source: metaSource(p),
    raw: p,
  };
}

function parseImmunization(im: FhirImmunization): ParsedClinical | null {
  const kind = codeText(im.vaccineCode);
  if (!kind || !im.occurrenceDateTime) return null;
  const recordedAt = new Date(im.occurrenceDateTime);
  if (isNaN(recordedAt.getTime())) return null;
  return {
    recordedAt,
    category: "immunizations",
    kind,
    valueNumeric: null,
    valueText: im.status ?? null,
    unit: null,
    referenceLow: null,
    referenceHigh: null,
    abnormalFlag: null,
    source: metaSource(im),
    raw: im,
  };
}

export function parseFhirResource(
  category: string,
  fhirJson: string,
): ParsedClinical | null {
  let r: { resourceType?: string };
  try {
    r = JSON.parse(fhirJson);
  } catch {
    return null;
  }

  switch (r.resourceType) {
    case "Observation":
      return parseObservation(r as FhirObservation, category);
    case "Condition":
      return parseCondition(r as FhirCondition);
    case "MedicationRequest":
    case "MedicationStatement":
      return parseMedicationRequest(r as FhirMedicationRequest);
    case "AllergyIntolerance":
      return parseAllergyIntolerance(r as FhirAllergyIntolerance);
    case "Procedure":
      return parseProcedure(r as FhirProcedure);
    case "Immunization":
      return parseImmunization(r as FhirImmunization);
    default:
      return null;
  }
}
