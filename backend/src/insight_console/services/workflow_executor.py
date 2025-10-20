from datetime import datetime
from sqlalchemy.orm import Session
from insight_console.models.workflow import Workflow, WorkflowStatus, WorkflowType
from insight_console.models.deal import Deal
from insight_console.skills.competitive_analysis import CompetitiveAnalysisSkill

class WorkflowExecutor:
    """Service for executing analysis workflows"""

    def __init__(self, db: Session):
        self.db = db

    def execute_workflow(self, workflow_id: int) -> dict:
        """Execute a workflow and update its status"""
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Update status to running
        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = datetime.utcnow()
        self.db.commit()

        try:
            # Get deal for context
            deal = self.db.query(Deal).filter(Deal.id == workflow.deal_id).first()

            # Execute appropriate skill based on workflow type
            if workflow.workflow_type == WorkflowType.COMPETITIVE_ANALYSIS:
                result = self._execute_competitive_analysis(workflow, deal)
            else:
                raise NotImplementedError(f"Workflow type {workflow.workflow_type} not yet implemented")

            # Update workflow with results
            workflow.findings = result
            workflow.status = WorkflowStatus.COMPLETED
            workflow.progress_percent = 100
            workflow.completed_at = datetime.utcnow()
            workflow.current_step = "Complete"

            self.db.commit()
            self.db.refresh(workflow)

            return result

        except Exception as e:
            # Mark workflow as failed
            workflow.status = WorkflowStatus.FAILED
            workflow.error_message = str(e)
            self.db.commit()
            raise

    def _execute_competitive_analysis(self, workflow: Workflow, deal: Deal) -> dict:
        """Execute competitive analysis skill"""
        workflow.current_step = "Analyzing competitors"
        workflow.progress_percent = 20
        self.db.commit()

        skill = CompetitiveAnalysisSkill()
        result = skill.execute(
            company_name=deal.target_company or deal.name,
            sector=deal.sector or "Unknown",
            key_questions=deal.key_questions or [],
            context=""
        )

        workflow.progress_percent = 80
        workflow.current_step = "Finalizing analysis"
        self.db.commit()

        return result
