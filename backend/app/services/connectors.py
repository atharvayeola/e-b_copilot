from dataclasses import dataclass
from typing import Protocol, Optional


@dataclass
class ConnectorResult:
    success: bool
    raw_text: Optional[str] = None
    failure_reason: Optional[str] = None


class EligibilityConnector(Protocol):
    def get_eligibility(self, payload: dict) -> ConnectorResult:
        ...


class MockEligibilityConnector:
    def get_eligibility(self, payload: dict) -> ConnectorResult:
        payer = (payload.get("payer_name") or "").lower()
        member_id = (payload.get("member_id") or "").strip()
        if not member_id:
            return ConnectorResult(success=False, failure_reason="missing member id")

        status = "active" if member_id[-1].isdigit() and int(member_id[-1]) % 2 == 0 else "inactive"
        raw_text = (
            f"Eligibility status: {status}\n"
            f"Member ID: {member_id}\n"
            "Effective: 2024-01-01 to 2024-12-31\n"
            "Copay: $25\n"
            "Coinsurance: 20%\n"
            "Deductible individual total: $500 remaining: $200\n"
            "OOP max individual total: $2000 remaining: $1500\n"
            "Visit limit: 12 visits per year\n"
            f"Payer: {payer.title()}\n"
        )
        return ConnectorResult(success=True, raw_text=raw_text)


class ManualEvidenceOnlyConnector:
    def get_eligibility(self, payload: dict) -> ConnectorResult:
        return ConnectorResult(success=False, failure_reason="requires evidence upload")


def get_connector(payer_name: str) -> EligibilityConnector:
    if payer_name.lower().startswith("manual"):
        return ManualEvidenceOnlyConnector()
    return MockEligibilityConnector()
