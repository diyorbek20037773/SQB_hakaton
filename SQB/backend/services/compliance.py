"""
Compliance checking service.
Loads rules from compliance_rules.json and checks transcript/text for violations.
"""
import json
import os
from typing import Optional

_RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "compliance_rules.json")
_rules_cache: Optional[dict] = None


def load_rules() -> dict:
    global _rules_cache
    if _rules_cache is None:
        try:
            with open(_RULES_PATH, encoding="utf-8") as f:
                _rules_cache = json.load(f)
        except Exception as exc:
            print(f"[Compliance] Could not load compliance_rules.json: {exc}")
            _rules_cache = {
                "kyc_checklist": [],
                "forbidden_phrases": [],
                "aml_thresholds": {},
            }
    return _rules_cache


def get_kyc_checklist() -> list:
    """Return the standard KYC checklist items."""
    rules = load_rules()
    return rules.get("kyc_checklist", [])


def check_forbidden_phrases(text: str) -> list:
    """
    Detect any forbidden phrases in the given text.
    Returns list of violations.
    """
    rules = load_rules()
    forbidden = rules.get("forbidden_phrases", [])
    text_lower = text.lower()

    violations = []
    for phrase in forbidden:
        if phrase.lower() in text_lower:
            violations.append(
                {
                    "type": "forbidden_phrase",
                    "phrase": phrase,
                    "description": f"Taqiqlangan ibora aniqlandi: '{phrase}'. Bu mijozga kafolat berish sifatida qaralishi mumkin.",
                    "severity": "high",
                }
            )
    return violations


def check_aml_amount(amount: float) -> Optional[dict]:
    """
    Check if an amount exceeds AML reporting thresholds.
    """
    rules = load_rules()
    thresholds = rules.get("aml_thresholds", {})
    cash_threshold = thresholds.get("cash_report", 50_000_000)
    suspicious_threshold = thresholds.get("suspicious_report", 10_000_000)

    if amount >= cash_threshold:
        return {
            "type": "aml_cash_report",
            "description": f"Naqd pul operatsiyasi {amount:,.0f} so'm - majburiy hisobot talab qilinadi ({cash_threshold:,.0f} so'm chegarasi).",
            "severity": "critical",
        }
    elif amount >= suspicious_threshold:
        return {
            "type": "aml_suspicious",
            "description": f"Shubhali operatsiya {amount:,.0f} so'm - qo'shimcha tekshiruv talab qilinadi.",
            "severity": "high",
        }
    return None


def check_compliance(transcript: str) -> list:
    """
    Full compliance check on a transcript.
    Returns list of compliance violations found.
    """
    violations = []

    # 1. Check forbidden phrases
    phrase_violations = check_forbidden_phrases(transcript)
    violations.extend(phrase_violations)

    # 2. Check for KYC completeness
    rules = load_rules()
    kyc_items = rules.get("kyc_checklist", [])
    transcript_lower = transcript.lower()

    for item in kyc_items:
        if not item.get("required", False):
            continue
        keywords = item.get("trigger_keywords", [])
        found = any(kw.lower() in transcript_lower for kw in keywords)
        if not found:
            violations.append(
                {
                    "type": "kyc_missing",
                    "item_id": item["id"],
                    "description": f"KYC talabi bajarilmagan: {item['question']}",
                    "severity": "medium",
                }
            )

    # 3. Check for large amount mentions (simple heuristic)
    import re
    amounts = re.findall(r"(\d[\d\s]*)\s*(?:million|mln|mlrd|milliard|so'm|uzs)", transcript_lower)
    for amount_str in amounts:
        try:
            clean = amount_str.replace(" ", "")
            val = float(clean)
            # crude: if "million" follows, multiply
            if "million" in transcript_lower or "mln" in transcript_lower:
                val *= 1_000_000
            aml_result = check_aml_amount(val)
            if aml_result:
                violations.append(aml_result)
                break  # only report once
        except ValueError:
            pass

    return violations


def get_compliance_score(violations: list) -> float:
    """
    Calculate a compliance score (0-100) based on violations.
    """
    if not violations:
        return 100.0

    penalty_map = {
        "critical": 30,
        "high": 15,
        "medium": 8,
        "low": 3,
    }

    total_penalty = sum(penalty_map.get(v.get("severity", "low"), 3) for v in violations)
    score = max(0.0, 100.0 - total_penalty)
    return round(score, 1)
