"""
Call summary generation service.
Wraps gemini_service.generate_call_summary with additional logic.
"""
from services.gemini_service import generate_call_summary as _gemini_summary
from services.compliance import check_compliance, get_compliance_score


async def generate_summary(
    transcript: str,
    customer_name: str = "Noma'lum mijoz",
    operator_name: str = "Operator",
) -> dict:
    """
    Generate a full structured call summary.
    Combines Gemini AI summary with compliance checks.
    """
    # Run compliance check
    violations = check_compliance(transcript)
    compliance_score = get_compliance_score(violations)

    # Get AI summary
    ai_result = await _gemini_summary(transcript, customer_name, operator_name)

    # Merge results
    return {
        "summary": ai_result.get("summary", "Qo'ng'iroq yakunlandi."),
        "key_topics": ai_result.get("key_topics", []),
        "next_steps": ai_result.get("next_steps", []),
        "quality_score": ai_result.get("quality_score", 70.0),
        "sentiment": ai_result.get("sentiment", "neutral"),
        "compliance_score": compliance_score,
        "compliance_violations": violations,
    }
