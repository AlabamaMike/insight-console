from typing import Dict, List
from anthropic import Anthropic
from insight_console.config import settings
import json

class ManagementAssessmentSkill:
    """
    Claude skill for management team assessment.
    Evaluates leadership team capabilities, experience, and track record.
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
        Execute management assessment workflow.

        Returns dict with:
        - leadership_team: Key executives and backgrounds
        - experience_assessment: Relevant experience evaluation
        - track_record: Past performance and achievements
        - gaps_and_risks: Identified gaps or concerns
        - sources: Citations
        """

        prompt = f"""You are an executive assessment consultant evaluating the management team for a PE deal.

Company: {company_name}
Sector: {sector}

Key Questions:
{chr(10).join(f"- {q}" for q in key_questions if any(term in q.lower() for term in ["management", "team", "leadership", "executive", "ceo", "founder"]))}

Additional Context:
{context}

Conduct a management team assessment and return JSON with this structure:
{{
    "leadership_team": {{
        "ceo": {{
            "background": "Brief background and experience",
            "strengths": ["strength 1", "strength 2"],
            "experience_years_sector": "X years in sector",
            "previous_exits": "Any successful exits or major achievements"
        }},
        "cfo": {{
            "background": "Brief background",
            "strengths": ["strength 1"],
            "experience_years": "X years"
        }},
        "other_key_executives": [
            {{
                "role": "CTO/COO/etc",
                "background": "Brief background",
                "strengths": ["strength 1"]
            }}
        ]
    }},
    "team_assessment": {{
        "overall_quality": "strong/adequate/weak",
        "domain_expertise": {{
            "rating": "high/medium/low",
            "justification": "Why this rating"
        }},
        "execution_capability": {{
            "rating": "high/medium/low",
            "justification": "Evidence of execution capability"
        }},
        "scaling_experience": {{
            "rating": "high/medium/low",
            "justification": "Experience scaling similar businesses"
        }}
    }},
    "track_record": {{
        "key_achievements": ["achievement 1", "achievement 2"],
        "growth_milestones": ["milestone 1", "milestone 2"],
        "challenges_overcome": ["challenge 1", "challenge 2"]
    }},
    "gaps_and_risks": {{
        "identified_gaps": [
            {{
                "area": "Role or capability area",
                "severity": "high/medium/low",
                "description": "Description of the gap"
            }}
        ],
        "succession_risks": "Assessment of key person dependencies",
        "mitigation_recommendations": ["recommendation 1", "recommendation 2"]
    }},
    "cultural_factors": {{
        "leadership_style": "Description of leadership approach",
        "alignment_with_growth": "How culture supports/hinders growth goals",
        "retention_risks": "Assessment of retention risks"
    }},
    "sources": ["source 1", "source 2"]
}}

Base your assessment on typical {sector} leadership requirements. Note any assumptions about publicly available information."""

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
                "leadership_team": {},
                "team_assessment": {},
                "track_record": {},
                "gaps_and_risks": {},
                "cultural_factors": {},
                "sources": []
            }
