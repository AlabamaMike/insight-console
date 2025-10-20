from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class MarketSizingSkill:
    """
    Claude skill for market sizing analysis.
    Analyzes TAM, SAM, SOM, market growth, and market dynamics.
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
        Execute market sizing workflow.

        Returns dict with:
        - market_size: TAM, SAM, SOM estimates
        - growth_analysis: Market growth rates and trends
        - market_dynamics: Key drivers, barriers, trends
        - sources: Citations
        """

        prompt = f"""You are a market research analyst conducting market sizing for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if "market" in q.lower() or "growth" in q.lower() or "size" in q.lower())}

Additional Context:
{context}

Conduct a market sizing analysis and return JSON with this structure:
{{
    "market_size": {{
        "tam": {{
            "value_usd": "Total addressable market in USD",
            "methodology": "How this was calculated",
            "assumptions": ["assumption 1", "assumption 2"]
        }},
        "sam": {{
            "value_usd": "Serviceable addressable market in USD",
            "methodology": "How this was calculated",
            "percentage_of_tam": "X%"
        }},
        "som": {{
            "value_usd": "Serviceable obtainable market in USD",
            "methodology": "How this was calculated",
            "percentage_of_sam": "X%"
        }}
    }},
    "growth_analysis": {{
        "historical_cagr": "X% (timeframe)",
        "projected_cagr": "X% (timeframe)",
        "growth_drivers": ["driver 1", "driver 2"],
        "growth_barriers": ["barrier 1", "barrier 2"]
    }},
    "market_dynamics": {{
        "market_maturity": "emerging/growth/mature/declining",
        "key_trends": ["trend 1", "trend 2"],
        "regulatory_factors": ["factor 1", "factor 2"],
        "technology_impact": "Description of how technology affects the market"
    }},
    "sources": ["source 1", "source 2"]
}}

Base your analysis on general knowledge of the {sector} industry. Provide reasonable estimates and clearly note assumptions."""

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
                "market_size": {},
                "growth_analysis": {},
                "market_dynamics": {},
                "sources": []
            }
