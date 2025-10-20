"""create workflows table

Revision ID: 004
Revises: 003
Create Date: 2025-10-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'workflows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('workflow_type', sa.Enum('COMPETITIVE_ANALYSIS', 'MARKET_SIZING', 'UNIT_ECONOMICS', 'MANAGEMENT_ASSESSMENT', 'FINANCIAL_BENCHMARKING', name='workflowtype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', name='workflowstatus'), nullable=False),
        sa.Column('progress_percent', sa.Integer(), nullable=True),
        sa.Column('current_step', sa.String(), nullable=True),
        sa.Column('findings', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('sources', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflows_id'), 'workflows', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_workflows_id'), table_name='workflows')
    op.drop_table('workflows')
