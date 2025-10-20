from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class UnitEconomicsSkill:
    """
    Claude skill for unit economics analysis.
    Analyzes CAC, LTV, payback periods, retention, and profitability metrics.
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
        Execute unit economics workflow.

        Returns dict with:
        - customer_metrics: CAC, LTV, payback period
        - retention_metrics: Churn, NRR, GRR
        - profitability: Unit margins, contribution margins
        - sources: Citations
        """

        prompt = f"""You are a financial analyst conducting unit economics analysis for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if any(term in q.lower() for term in ["unit", "economics", "cac", "ltv", "retention", "churn", "margin"]))}

Additional Context:
{context}

Conduct a unit economics analysis and return JSON with this structure:
{{
    "customer_acquisition": {{
        "cac": {{
            "value_usd": "Customer acquisition cost in USD",
            "methodology": "How this was calculated",
            "trend": "improving/stable/deteriorating"
        }},
        "sales_efficiency": {{
            "cac_payback_months": "X months",
            "magic_number": "Sales efficiency ratio if applicable"
        }}
    }},
    "customer_value": {{
        "ltv": {{
            "value_usd": "Lifetime value in USD",
            "methodology": "How this was calculated",
            "ltv_cac_ratio": "X:1"
        }},
        "arpu": "Average revenue per user/account"
    }},
    "retention_metrics": {{
        "gross_retention": "GRR percentage",
        "net_retention": "NRR percentage",
        "churn_rate": "Monthly/annual churn percentage",
        "expansion_revenue": "Percentage from upsells/cross-sells"
    }},
    "profitability": {{
        "gross_margin": "X%",
        "contribution_margin": "X%",
        "unit_economics_assessment": "Assessment of overall unit economics health",
        "path_to_profitability": "Description of path to profitability"
    }},
    "benchmarks": {{
        "industry_comparison": "How metrics compare to industry standards",
        "areas_of_strength": ["strength 1", "strength 2"],
        "areas_of_concern": ["concern 1", "concern 2"]
    }},
    "sources": ["source 1", "source 2"]
}}

Base your analysis on typical {sector} metrics. Provide reasonable estimates and clearly note assumptions."""

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
                "customer_acquisition": {},
                "customer_value": {},
                "retention_metrics": {},
                "profitability": {},
                "benchmarks": {},
                "sources": []
            }
