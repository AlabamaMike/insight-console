"""create syntheses table

Revision ID: 005
Revises: 004
Create Date: 2025-10-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'syntheses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', name='synthesisstatus'), nullable=False),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('key_insights', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('recommendation', sa.Enum('STRONG_BUY', 'BUY', 'HOLD', 'PASS', 'STRONG_PASS', name='investmentrecommendation'), nullable=True),
        sa.Column('recommendation_rationale', sa.Text(), nullable=True),
        sa.Column('overall_confidence', sa.Float(), nullable=True),
        sa.Column('confidence_by_dimension', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('key_risks', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('risk_mitigation', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('key_opportunities', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('value_creation_levers', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('deal_score', sa.Float(), nullable=True),
        sa.Column('dimension_scores', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('compiled_findings', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('cross_workflow_insights', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('recommended_next_steps', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('information_gaps', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('workflows_included', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('deal_id')
    )
    op.create_index(op.f('ix_syntheses_id'), 'syntheses', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_syntheses_id'), table_name='syntheses')
    op.drop_table('syntheses')
