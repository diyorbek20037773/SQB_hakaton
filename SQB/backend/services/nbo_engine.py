"""
Rule-based Next Best Offer engine.
Used as a fast, synchronous fallback when Gemini is unavailable or slow.
"""
import json
import os
from typing import Optional


_PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "products.json")
_products_cache: Optional[list] = None


def load_products() -> list:
    global _products_cache
    if _products_cache is None:
        try:
            with open(_PRODUCTS_PATH, encoding="utf-8") as f:
                _products_cache = json.load(f)
        except Exception as exc:
            print(f"[NBOEngine] Could not load products.json: {exc}")
            _products_cache = []
    return _products_cache


def _customer_has_product(customer_products: list, product_type: str) -> bool:
    return product_type in [p.lower() for p in customer_products]


def _keywords_match(topics: list, keywords: list) -> bool:
    topics_lower = [t.lower() for t in topics]
    return any(k.lower() in " ".join(topics_lower) for k in keywords)


def suggest_product(
    customer: dict,
    topics: list = None,
    existing_products: list = None,
) -> Optional[dict]:
    """
    Rule-based NBO logic.
    Returns best product recommendation or None.
    """
    products = load_products()
    if not products:
        return None

    topics = topics or []
    existing_products = existing_products or customer.get("existing_products", [])
    segment = customer.get("segment", "Standard")
    monthly_income = customer.get("monthly_income", 0)
    credit_score = customer.get("credit_score", 600)
    age = customer.get("age", 30)

    candidates = []

    for product in products:
        score = 0
        reason_parts = []

        # Segment filter
        target_segments = product.get("target_segments", [])
        if target_segments and segment not in target_segments:
            continue

        # Income filter
        min_income = product.get("min_income", 0)
        if monthly_income < min_income:
            continue

        # Skip already-owned products (by type)
        product_type = product.get("type", "")
        if _customer_has_product(existing_products, product_type):
            score -= 10

        # Topic matching
        keywords = product.get("keywords", [])
        if _keywords_match(topics, keywords):
            score += 30
            reason_parts.append("Mijoz qiziqishi mos keladi")

        # Segment bonus
        if segment == "VIP" and product["id"] in ("cc_gold", "deposit_12m"):
            score += 20
            reason_parts.append("VIP mijoz uchun maxsus")
        elif segment == "Premium" and product["id"] in ("cc_gold", "deposit_12m", "insurance_life"):
            score += 15
            reason_parts.append("Premium segment uchun mos")
        elif segment == "Standard":
            score += 5

        # Credit score bonus for credit products
        if product_type in ("credit_card", "mortgage", "overdraft", "business_loan"):
            if credit_score >= 750:
                score += 15
                reason_parts.append("Yuqori kredit reytingi")
            elif credit_score >= 650:
                score += 8
            elif credit_score < 550:
                score -= 20

        # Age-based rules
        if product_type == "mortgage" and 25 <= age <= 45:
            score += 10
            reason_parts.append("Ipoteka yoshiga mos")
        if product_type == "insurance_life" and age >= 30:
            score += 8

        # Income-based rules
        if product_type == "deposit" and monthly_income > 5_000_000:
            score += 12
            reason_parts.append("Daromad darajasi depozit uchun mos")

        if score > 0:
            candidates.append(
                {
                    "product": product,
                    "score": score,
                    "reason": "; ".join(reason_parts) if reason_parts else "Umumiy tavsiya",
                }
            )

    if not candidates:
        # Default fallback
        for p in products:
            if p["id"] == "deposit_12m":
                return {
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "reason": "Standart depozit tavsiyasi",
                    "confidence": 0.3,
                }
        return None

    best = max(candidates, key=lambda x: x["score"])
    max_score = 60  # approximate max possible score
    confidence = min(best["score"] / max_score, 1.0)

    return {
        "product_id": best["product"]["id"],
        "product_name": best["product"]["name"],
        "reason": best["reason"],
        "confidence": round(confidence, 2),
    }


def get_all_products() -> list:
    return load_products()


def get_product_by_id(product_id: str) -> Optional[dict]:
    for p in load_products():
        if p["id"] == product_id:
            return p
    return None
