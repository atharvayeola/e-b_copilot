import re
from dataclasses import dataclass
from typing import Any, Optional

from app.core.config import settings


@dataclass
class EvidenceRef:
    artifact_id: str
    text_span: list[int]
    page: Optional[int] = None


@dataclass
class FieldExtraction:
    field_name: str
    value: Any
    confidence: float
    evidence: Optional[EvidenceRef]


@dataclass
class ExtractionResult:
    raw_output: dict[str, Any]
    fields: list[FieldExtraction]
    needs_review: bool


FIELD_NAMES = [
    "eligibility_status",
    "effective_from",
    "effective_to",
    "copay",
    "coinsurance",
    "deductible_total_individual",
    "deductible_remaining_individual",
    "deductible_total_family",
    "deductible_remaining_family",
    "oop_max_total_individual",
    "oop_max_remaining_individual",
    "oop_max_total_family",
    "oop_max_remaining_family",
    "limitations",
]


def _find_match(artifacts: list[dict], pattern: str) -> Optional[tuple[re.Match, dict]]:
    for artifact in artifacts:
        text = artifact.get("text") or ""
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match, artifact
    return None


def _currency_value(amount: str) -> dict[str, Any]:
    clean = re.sub(r"[^0-9.]", "", amount)
    if not clean:
        return {"amount": None, "currency": "USD"}
    return {"amount": float(clean), "currency": "USD"}


def _percent_value(percent: str) -> dict[str, Any]:
    clean = re.sub(r"[^0-9.]", "", percent)
    if not clean:
        return {"percent": None}
    return {"percent": float(clean)}


def _evidence_from_match(match: re.Match, artifact: dict) -> EvidenceRef:
    return EvidenceRef(
        artifact_id=artifact["id"],
        text_span=[match.start(), match.end()],
    )


def mock_extract(artifacts: list[dict]) -> ExtractionResult:
    results: list[FieldExtraction] = []
    raw_output: dict[str, Any] = {}

    patterns = {
        "eligibility_status": r"Eligibility status:\s*(active|inactive|unknown)",
        "effective": r"Effective:\s*(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})",
        "copay": r"Copay:\s*\$([0-9,.]+)",
        "coinsurance": r"Coinsurance:\s*([0-9,.]+%)",
        "deductible_individual": r"Deductible individual total:\s*\$([0-9,.]+)\s*remaining:\s*\$([0-9,.]+)",
        "deductible_family": r"Deductible family total:\s*\$([0-9,.]+)\s*remaining:\s*\$([0-9,.]+)",
        "oop_individual": r"OOP max individual total:\s*\$([0-9,.]+)\s*remaining:\s*\$([0-9,.]+)",
        "oop_family": r"OOP max family total:\s*\$([0-9,.]+)\s*remaining:\s*\$([0-9,.]+)",
        "limitations": r"Visit limit:\s*([\w\s]+)",
    }

    eligibility_match = _find_match(artifacts, patterns["eligibility_status"])
    if eligibility_match:
        match, artifact = eligibility_match
        value = match.group(1).lower()
        evidence = _evidence_from_match(match, artifact)
        results.append(FieldExtraction("eligibility_status", value, 0.9, evidence))
    else:
        results.append(FieldExtraction("eligibility_status", "unknown", 0.0, None))

    effective_match = _find_match(artifacts, patterns["effective"])
    if effective_match:
        match, artifact = effective_match
        from_date = match.group(1)
        to_date = match.group(2)
        evidence = _evidence_from_match(match, artifact)
        results.append(FieldExtraction("effective_from", from_date, 0.85, evidence))
        results.append(FieldExtraction("effective_to", to_date, 0.85, evidence))
    else:
        results.append(FieldExtraction("effective_from", "unknown", 0.0, None))
        results.append(FieldExtraction("effective_to", "unknown", 0.0, None))

    copay_match = _find_match(artifacts, patterns["copay"])
    if copay_match:
        match, artifact = copay_match
        results.append(
            FieldExtraction(
                "copay", _currency_value(match.group(1)), 0.7, _evidence_from_match(match, artifact)
            )
        )
    else:
        results.append(FieldExtraction("copay", "unknown", 0.0, None))

    coinsurance_match = _find_match(artifacts, patterns["coinsurance"])
    if coinsurance_match:
        match, artifact = coinsurance_match
        results.append(
            FieldExtraction(
                "coinsurance",
                _percent_value(match.group(1)),
                0.7,
                _evidence_from_match(match, artifact),
            )
        )
    else:
        results.append(FieldExtraction("coinsurance", "unknown", 0.0, None))

    deductible_ind_match = _find_match(artifacts, patterns["deductible_individual"])
    if deductible_ind_match:
        match, artifact = deductible_ind_match
        evidence = _evidence_from_match(match, artifact)
        results.append(
            FieldExtraction(
                "deductible_total_individual", _currency_value(match.group(1)), 0.7, evidence
            )
        )
        results.append(
            FieldExtraction(
                "deductible_remaining_individual", _currency_value(match.group(2)), 0.7, evidence
            )
        )
    else:
        results.append(FieldExtraction("deductible_total_individual", "unknown", 0.0, None))
        results.append(FieldExtraction("deductible_remaining_individual", "unknown", 0.0, None))

    deductible_fam_match = _find_match(artifacts, patterns["deductible_family"])
    if deductible_fam_match:
        match, artifact = deductible_fam_match
        evidence = _evidence_from_match(match, artifact)
        results.append(
            FieldExtraction(
                "deductible_total_family", _currency_value(match.group(1)), 0.7, evidence
            )
        )
        results.append(
            FieldExtraction(
                "deductible_remaining_family", _currency_value(match.group(2)), 0.7, evidence
            )
        )
    else:
        results.append(FieldExtraction("deductible_total_family", "unknown", 0.0, None))
        results.append(FieldExtraction("deductible_remaining_family", "unknown", 0.0, None))

    oop_ind_match = _find_match(artifacts, patterns["oop_individual"])
    if oop_ind_match:
        match, artifact = oop_ind_match
        evidence = _evidence_from_match(match, artifact)
        results.append(
            FieldExtraction("oop_max_total_individual", _currency_value(match.group(1)), 0.7, evidence)
        )
        results.append(
            FieldExtraction(
                "oop_max_remaining_individual", _currency_value(match.group(2)), 0.7, evidence
            )
        )
    else:
        results.append(FieldExtraction("oop_max_total_individual", "unknown", 0.0, None))
        results.append(FieldExtraction("oop_max_remaining_individual", "unknown", 0.0, None))

    oop_fam_match = _find_match(artifacts, patterns["oop_family"])
    if oop_fam_match:
        match, artifact = oop_fam_match
        evidence = _evidence_from_match(match, artifact)
        results.append(
            FieldExtraction("oop_max_total_family", _currency_value(match.group(1)), 0.7, evidence)
        )
        results.append(
            FieldExtraction("oop_max_remaining_family", _currency_value(match.group(2)), 0.7, evidence)
        )
    else:
        results.append(FieldExtraction("oop_max_total_family", "unknown", 0.0, None))
        results.append(FieldExtraction("oop_max_remaining_family", "unknown", 0.0, None))

    limitations_match = _find_match(artifacts, patterns["limitations"])
    if limitations_match:
        match, artifact = limitations_match
        results.append(
            FieldExtraction(
                "limitations", match.group(1).strip(), 0.6, _evidence_from_match(match, artifact)
            )
        )
    else:
        results.append(FieldExtraction("limitations", "unknown", 0.0, None))

    for field in results:
        raw_output[field.field_name] = {
            "value": field.value,
            "confidence": field.confidence,
            "evidence": None if not field.evidence else {
                "artifact_id": field.evidence.artifact_id,
                "text_span": field.evidence.text_span,
                "page": field.evidence.page,
            },
        }

    needs_review = True
    eligibility = next((f for f in results if f.field_name == "eligibility_status"), None)
    if eligibility and eligibility.value != "unknown" and eligibility.confidence >= 0.8:
        needs_review = False

    return ExtractionResult(raw_output=raw_output, fields=results, needs_review=needs_review)


def extract_with_llm(artifacts: list[dict]) -> ExtractionResult:
    if settings.llm_provider == "mock":
        return mock_extract(artifacts)
    # Placeholder for real LLM integration.
    return mock_extract(artifacts)
