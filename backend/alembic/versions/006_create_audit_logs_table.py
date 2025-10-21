"""create audit logs table

Revision ID: 006
Revises: 005
Create Date: 2025-10-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('firm_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', postgresql.INET(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient querying
    op.create_index('idx_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False, postgresql_using='btree', postgresql_ops={'timestamp': 'DESC'})
    op.create_index('idx_audit_logs_user', 'audit_logs', ['user_id', 'timestamp'], unique=False, postgresql_ops={'timestamp': 'DESC'})
    op.create_index('idx_audit_logs_firm', 'audit_logs', ['firm_id', 'timestamp'], unique=False, postgresql_ops={'timestamp': 'DESC'})
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('idx_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'], unique=False)

    # Add foreign key constraint to users table
    op.create_foreign_key('fk_audit_logs_user_id', 'audit_logs', 'users', ['user_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_audit_logs_user_id', 'audit_logs', type_='foreignkey')

    # Drop indexes
    op.drop_index('idx_audit_logs_resource', 'audit_logs')
    op.drop_index('idx_audit_logs_action', 'audit_logs')
    op.drop_index('idx_audit_logs_firm', 'audit_logs')
    op.drop_index('idx_audit_logs_user', 'audit_logs')
    op.drop_index('idx_audit_logs_timestamp', 'audit_logs')

    # Drop table
    op.drop_table('audit_logs')
