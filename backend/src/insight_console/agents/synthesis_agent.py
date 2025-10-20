import json
from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings

class SynthesisAgent:
    """
    Agent for synthesizing findings from multiple workflow analyses
    into actionable investment insights and recommendations.
    """

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    def synthesize(
        self,
        deal_name: str,
        sector: str,
        workflow_findings: Dict[str, Dict],
        key_questions: List[str],
        hypotheses: List[str]
    ) -> Dict:
        """
        Synthesize findings from all workflows into comprehensive analysis.

        Args:
            deal_name: Name of the deal/company
            sector: Industry sector
            workflow_findings: Dict mapping workflow_type to findings
            key_questions: Original key questions
            hypotheses: Original hypotheses to test

        Returns:
            Dict with synthesis results including recommendation, insights, risks, etc.
        """

        # Prepare findings summary for the prompt
        findings_text = self._format_findings(workflow_findings)

        prompt = f"""You are a senior PE investment professional synthesizing comprehensive due diligence findings.

DEAL: {deal_name}
SECTOR: {sector}

ORIGINAL KEY QUESTIONS:
{chr(10).join(f"- {q}" for q in key_questions)}

ORIGINAL HYPOTHESES:
{chr(10).join(f"- {h}" for h in hypotheses)}

ANALYSIS FINDINGS:
{findings_text}

Your task is to synthesize these findings into actionable investment insights. Return JSON with this EXACT structure:

{{
    "executive_summary": "2-3 paragraph executive summary covering: (1) investment thesis, (2) key strengths/opportunities, (3) major risks/concerns, (4) bottom-line recommendation",

    "key_insights": [
        "Critical insight 1 that emerged from analysis",
        "Critical insight 2",
        "Critical insight 3",
        "Critical insight 4",
        "Critical insight 5"
    ],

    "investment_recommendation": {{
        "recommendation": "strong_buy|buy|hold|pass|strong_pass",
        "rationale": "Clear 2-3 sentence rationale for this recommendation",
        "conviction_level": "high|medium|low"
    }},

    "hypothesis_validation": [
        {{
            "hypothesis": "Original hypothesis text",
            "validated": true|false,
            "evidence": "Summary of supporting or contradicting evidence"
        }}
    ],

    "key_risks": [
        {{
            "risk": "Risk description",
            "severity": "high|medium|low",
            "likelihood": "high|medium|low",
            "impact_area": "market|financial|operational|team|competitive"
        }}
    ],

    "risk_mitigation": [
        "Mitigation strategy 1",
        "Mitigation strategy 2",
        "Mitigation strategy 3"
    ],

    "key_opportunities": [
        {{
            "opportunity": "Opportunity description",
            "potential_impact": "high|medium|low",
            "timeframe": "near-term|medium-term|long-term"
        }}
    ],

    "value_creation_levers": [
        {{
            "lever": "Value creation lever description",
            "priority": "high|medium|low",
            "estimated_impact": "Description of potential impact"
        }}
    ],

    "cross_workflow_insights": [
        "Insight that connects findings across multiple analyses",
        "Another cross-cutting insight",
        "Third integrated insight"
    ],

    "dimension_scores": {{
        "market_attractiveness": 0-100,
        "competitive_position": 0-100,
        "financial_performance": 0-100,
        "management_quality": 0-100,
        "unit_economics": 0-100,
        "overall_score": 0-100
    }},

    "confidence_assessment": {{
        "overall_confidence": 0-100,
        "confidence_by_dimension": {{
            "competitive_analysis": 0-100,
            "market_sizing": 0-100,
            "unit_economics": 0-100,
            "management_assessment": 0-100,
            "financial_benchmarking": 0-100
        }},
        "confidence_rationale": "Why this confidence level"
    }},

    "information_gaps": [
        "Critical information still needed",
        "Another gap",
        "Third gap"
    ],

    "recommended_next_steps": [
        {{
            "step": "Next step description",
            "priority": "high|medium|low",
            "rationale": "Why this step is important"
        }}
    ]
}}

IMPORTANT:
- Be objective and data-driven in your analysis
- Highlight both strengths AND weaknesses
- Ensure recommendation aligns with the evidence
- Identify genuine risks, not just theoretical concerns
- Focus on actionable insights
- Return ONLY valid JSON, no other text"""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            result = json.loads(content)

            return result

        except Exception as e:
            return {
                "error": str(e),
                "executive_summary": "Synthesis failed",
                "key_insights": [],
                "investment_recommendation": {
                    "recommendation": "pass",
                    "rationale": f"Unable to synthesize due to error: {str(e)}",
                    "conviction_level": "low"
                }
            }

    def _format_findings(self, workflow_findings: Dict[str, Dict]) -> str:
        """Format workflow findings into readable text for the prompt"""
        formatted = []

        workflow_names = {
            "competitive_analysis": "COMPETITIVE ANALYSIS",
            "market_sizing": "MARKET SIZING",
            "unit_economics": "UNIT ECONOMICS",
            "management_assessment": "MANAGEMENT ASSESSMENT",
            "financial_benchmarking": "FINANCIAL BENCHMARKING"
        }

        for workflow_type, findings in workflow_findings.items():
            name = workflow_names.get(workflow_type, workflow_type.upper())
            formatted.append(f"\n{'='*60}\n{name}\n{'='*60}")
            formatted.append(json.dumps(findings, indent=2))

        return "\n".join(formatted)
