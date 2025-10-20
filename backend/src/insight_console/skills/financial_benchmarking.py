from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class FinancialBenchmarkingSkill:
    """
    Claude skill for financial benchmarking analysis.
    Compares company financial metrics against industry benchmarks and peers.
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
        Execute financial benchmarking workflow.

        Returns dict with:
        - revenue_metrics: Revenue benchmarks and comparison
        - profitability_metrics: Margin benchmarks
        - efficiency_metrics: Operational efficiency ratios
        - growth_metrics: Growth rate comparisons
        - sources: Citations
        """

        prompt = f"""You are a financial analyst conducting benchmarking analysis for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if any(term in q.lower() for term in ["benchmark", "financial", "metric", "performance", "comparison", "peer"]))}

Additional Context:
{context}

Conduct a financial benchmarking analysis and return JSON with this structure:
{{
    "revenue_metrics": {{
        "revenue_growth": {{
            "company_metric": "X% YoY",
            "industry_median": "Y% YoY",
            "industry_top_quartile": "Z% YoY",
            "assessment": "above/at/below benchmark"
        }},
        "revenue_per_employee": {{
            "company_metric": "$X",
            "industry_median": "$Y",
            "assessment": "above/at/below benchmark"
        }},
        "arr_per_customer": {{
            "company_metric": "$X (if applicable)",
            "industry_median": "$Y",
            "assessment": "above/at/below benchmark"
        }}
    }},
    "profitability_metrics": {{
        "gross_margin": {{
            "company_metric": "X%",
            "industry_median": "Y%",
            "industry_top_quartile": "Z%",
            "assessment": "above/at/below benchmark"
        }},
        "ebitda_margin": {{
            "company_metric": "X%",
            "industry_median": "Y%",
            "assessment": "above/at/below benchmark"
        }},
        "operating_margin": {{
            "company_metric": "X%",
            "industry_median": "Y%",
            "assessment": "above/at/below benchmark"
        }}
    }},
    "efficiency_metrics": {{
        "sales_efficiency": {{
            "company_metric": "Description or ratio",
            "industry_median": "Benchmark",
            "assessment": "above/at/below benchmark"
        }},
        "r_and_d_as_percentage_revenue": {{
            "company_metric": "X%",
            "industry_median": "Y%",
            "assessment": "above/at/below benchmark"
        }},
        "operating_leverage": {{
            "assessment": "Description of operating leverage",
            "trend": "improving/stable/deteriorating"
        }}
    }},
    "growth_metrics": {{
        "rule_of_40": {{
            "company_score": "Growth% + Margin% = X",
            "industry_median": "Y",
            "assessment": "Strong/Adequate/Weak performance"
        }},
        "growth_efficiency": {{
            "metric": "Growth per dollar spent (if applicable)",
            "assessment": "Efficiency evaluation"
        }}
    }},
    "capital_efficiency": {{
        "burn_multiple": "If applicable for growth companies",
        "cash_conversion": "Cash generation capability",
        "working_capital": "Working capital efficiency"
    }},
    "overall_assessment": {{
        "relative_performance": "Overall performance vs peers",
        "key_strengths": ["strength 1", "strength 2"],
        "key_weaknesses": ["weakness 1", "weakness 2"],
        "valuation_implications": "How metrics impact valuation"
    }},
    "sources": ["source 1", "source 2"]
}}

Base your benchmarks on typical {sector} industry standards. Provide reasonable estimates for industry medians and note all assumptions."""

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
                "revenue_metrics": {},
                "profitability_metrics": {},
                "efficiency_metrics": {},
                "growth_metrics": {},
                "capital_efficiency": {},
                "overall_assessment": {},
                "sources": []
            }
