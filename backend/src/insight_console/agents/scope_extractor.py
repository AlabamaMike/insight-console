import json
from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings

class ScopeExtractor:
    """Agent for extracting analysis scope from investment materials"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    def extract_scope(self, text: str, sector: str, deal_type: str) -> Dict:
        """
        Extract key questions, hypotheses, and recommended workflows
        from investment memo or deal materials.
        """
        if not text.strip():
            # Return defaults for empty input
            return self._get_default_scope(sector, deal_type)

        prompt = f"""You are analyzing materials for a PE {deal_type} deal in the {sector} sector.

Extract the following from the provided text:
1. Key questions the investor wants answered
2. Hypotheses to test
3. Recommended analysis workflows

Text:
{text}

Return your response as JSON with this structure:
{{
    "key_questions": ["question 1", "question 2", ...],
    "hypotheses": ["hypothesis 1", "hypothesis 2", ...],
    "recommended_workflows": ["competitive_analysis", "market_sizing", "unit_economics", "management_assessment", "financial_benchmarking"]
}}

Only include workflows that are relevant to the questions and sector."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Extract text content
            content = response.content[0].text

            # Parse JSON
            result = json.loads(content)

            return result
        except Exception as e:
            # Fallback to defaults on error
            print(f"Error extracting scope: {e}")
            return self._get_default_scope(sector, deal_type)

    def _get_default_scope(self, sector: str, deal_type: str) -> Dict:
        """Return default scope when extraction fails or no text provided"""
        defaults = {
            "key_questions": [
                f"What is the competitive landscape in {sector}?",
                "What are the growth prospects and market dynamics?",
                "Are the unit economics attractive?"
            ],
            "hypotheses": [
                "The company has a defensible market position",
                "There is a clear path to profitability"
            ],
            "recommended_workflows": [
                "competitive_analysis",
                "market_sizing",
                "unit_economics",
                "financial_benchmarking"
            ]
        }
        return defaults
