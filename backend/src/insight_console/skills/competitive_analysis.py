from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class CompetitiveAnalysisSkill:
    """
    Claude skill for competitive analysis.
    Analyzes competitors, market positioning, and competitive dynamics.
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    def execute(
        self,
        company_name: str,
        sector: str,
        key_questions: List[str],
        context: str = ""
    ) -> Dict:
        """
        Execute competitive analysis workflow.

        Returns dict with:
        - competitors: List of competitors
        - market_position: Analysis of company's position
        - competitive_dynamics: Key competitive dynamics
        - sources: Citations
        """

        prompt = f"""You are a strategy consultant conducting competitive analysis for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if "compet" in q.lower())}

Additional Context:
{context}

Conduct a competitive analysis and return JSON with this structure:
{{
    "competitors": [
        {{"name": "Competitor 1", "description": "Brief description", "market_share": "estimate if known"}},
        ...
    ],
    "market_position": {{
        "positioning": "How the company is positioned",
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"],
        "differentiation": "What makes them different"
    }},
    "competitive_dynamics": {{
        "market_structure": "Description of market structure (fragmented, consolidated, etc.)",
        "key_trends": ["trend 1", "trend 2"],
        "threats": ["threat 1", "threat 2"]
    }},
    "sources": ["source 1", "source 2"]
}}

Base your analysis on general knowledge of the {sector} industry. Note any assumptions."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            result = json.loads(content)

            return result
        except Exception as e:
            return {
                "error": str(e),
                "competitors": [],
                "market_position": {},
                "competitive_dynamics": {},
                "sources": []
            }
