from datetime import datetime
from sqlalchemy.orm import Session
from insight_console.models.synthesis import Synthesis, SynthesisStatus, InvestmentRecommendation
from insight_console.models.workflow import Workflow, WorkflowStatus
from insight_console.models.deal import Deal, DealStatus
from insight_console.agents.synthesis_agent import SynthesisAgent

class SynthesisService:
    """Service for generating synthesis from completed workflows"""

    def __init__(self, db: Session):
        self.db = db

    def generate_synthesis(self, deal_id: int) -> Synthesis:
        """
        Generate synthesis for a deal by compiling all completed workflow findings.

        Args:
            deal_id: The deal to synthesize

        Returns:
            Synthesis object with results

        Raises:
            ValueError: If deal not found or no completed workflows
        """
        # Get deal
        deal = self.db.query(Deal).filter(Deal.id == deal_id).first()
        if not deal:
            raise ValueError(f"Deal {deal_id} not found")

        # Get all completed workflows
        workflows = self.db.query(Workflow).filter(
            Workflow.deal_id == deal_id,
            Workflow.status == WorkflowStatus.COMPLETED
        ).all()

        if not workflows:
            raise ValueError(f"No completed workflows found for deal {deal_id}")

        # Check if synthesis already exists
        synthesis = self.db.query(Synthesis).filter(Synthesis.deal_id == deal_id).first()
        if not synthesis:
            synthesis = Synthesis(deal_id=deal_id, status=SynthesisStatus.PENDING)
            self.db.add(synthesis)
            self.db.commit()
            self.db.refresh(synthesis)

        # Update status to generating
        synthesis.status = SynthesisStatus.GENERATING
        self.db.commit()

        try:
            # Compile workflow findings
            workflow_findings = {}
            workflows_included = []

            for workflow in workflows:
                workflow_type = workflow.workflow_type.value
                workflow_findings[workflow_type] = workflow.findings
                workflows_included.append(workflow_type)

            # Run synthesis agent
            agent = SynthesisAgent()
            result = agent.synthesize(
                deal_name=deal.target_company or deal.name,
                sector=deal.sector or "Unknown",
                workflow_findings=workflow_findings,
                key_questions=deal.key_questions or [],
                hypotheses=deal.hypotheses or []
            )

            # Extract and store results
            synthesis.executive_summary = result.get("executive_summary", "")
            synthesis.key_insights = result.get("key_insights", [])

            # Investment recommendation
            rec = result.get("investment_recommendation", {})
            rec_value = rec.get("recommendation", "pass")
            synthesis.recommendation = self._map_recommendation(rec_value)
            synthesis.recommendation_rationale = rec.get("rationale", "")

            # Confidence scoring
            confidence = result.get("confidence_assessment", {})
            synthesis.overall_confidence = confidence.get("overall_confidence", 50.0)
            synthesis.confidence_by_dimension = confidence.get("confidence_by_dimension", {})

            # Risks and opportunities
            synthesis.key_risks = result.get("key_risks", [])
            synthesis.risk_mitigation = result.get("risk_mitigation", [])
            synthesis.key_opportunities = result.get("key_opportunities", [])
            synthesis.value_creation_levers = result.get("value_creation_levers", [])

            # Scores
            dimension_scores = result.get("dimension_scores", {})
            synthesis.deal_score = dimension_scores.get("overall_score", 50.0)
            synthesis.dimension_scores = dimension_scores

            # Compiled data
            synthesis.compiled_findings = workflow_findings
            synthesis.cross_workflow_insights = result.get("cross_workflow_insights", [])

            # Next steps and gaps
            synthesis.recommended_next_steps = result.get("recommended_next_steps", [])
            synthesis.information_gaps = result.get("information_gaps", [])

            # Metadata
            synthesis.workflows_included = workflows_included

            # Mark as completed
            synthesis.status = SynthesisStatus.COMPLETED
            synthesis.completed_at = datetime.utcnow()

            # Update deal status
            deal.status = DealStatus.SYNTHESIS

            self.db.commit()
            self.db.refresh(synthesis)

            return synthesis

        except Exception as e:
            # Mark as failed
            synthesis.status = SynthesisStatus.FAILED
            synthesis.error_message = str(e)
            self.db.commit()
            raise

    def _map_recommendation(self, rec_str: str) -> InvestmentRecommendation:
        """Map string recommendation to enum"""
        mapping = {
            "strong_buy": InvestmentRecommendation.STRONG_BUY,
            "buy": InvestmentRecommendation.BUY,
            "hold": InvestmentRecommendation.HOLD,
            "pass": InvestmentRecommendation.PASS,
            "strong_pass": InvestmentRecommendation.STRONG_PASS
        }
        return mapping.get(rec_str.lower(), InvestmentRecommendation.PASS)
