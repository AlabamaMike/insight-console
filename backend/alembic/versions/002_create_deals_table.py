"""create deals table

Revision ID: 002
Revises: 001
Create Date: 2025-10-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'  # Previous migration
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'deals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('target_company', sa.String(), nullable=True),
        sa.Column('sector', sa.String(), nullable=True),
        sa.Column('deal_type', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'ANALYZING', 'SYNTHESIS', 'READY', 'ARCHIVED', name='dealstatus'), nullable=False),
        sa.Column('key_questions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('hypotheses', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('firm_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deals_firm_id'), 'deals', ['firm_id'], unique=False)
    op.create_index(op.f('ix_deals_id'), 'deals', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_deals_id'), table_name='deals')
    op.drop_index(op.f('ix_deals_firm_id'), table_name='deals')
    op.drop_table('deals')
