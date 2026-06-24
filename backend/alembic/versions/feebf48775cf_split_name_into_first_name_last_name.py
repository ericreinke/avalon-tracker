"""split name into first_name last_name

Revision ID: feebf48775cf
Revises: c5a8b205baac
Create Date: 2026-06-24 16:35:42.209734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'feebf48775cf'
down_revision: Union[str, Sequence[str], None] = 'c5a8b205baac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns with safe defaults so they work with existing rows
    op.add_column('players', sa.Column('first_name', sa.String(length=50),
                                        nullable=False, server_default=''))
    op.add_column('players', sa.Column('last_name', sa.String(length=50),
                                        nullable=False, server_default=''))

    # 2. Migrate existing data: split "name" into first_name / last_name
    #    First word → first_name, remainder → last_name
    op.execute("""
        UPDATE players
        SET first_name = split_part(name, ' ', 1),
            last_name  = CASE
                WHEN position(' ' in name) > 0
                THEN substring(name from position(' ' in name) + 1)
                ELSE ''
            END
    """)

    # 3. Drop the old column and its unique constraint
    op.drop_constraint('players_name_key', 'players', type_='unique')
    op.drop_column('players', 'name')

    # 4. Remove the server_default from first_name (was only needed for migration)
    op.alter_column('players', 'first_name', server_default=None)


def downgrade() -> None:
    # 1. Re-add name column
    op.add_column('players', sa.Column('name', sa.VARCHAR(length=100),
                                        nullable=False, server_default=''))

    # 2. Migrate data back: combine first + last
    op.execute("""
        UPDATE players
        SET name = CASE
            WHEN last_name != '' THEN first_name || ' ' || last_name
            ELSE first_name
        END
    """)

    # 3. Restore unique constraint and drop server_default
    op.create_unique_constraint('players_name_key', 'players', ['name'])
    op.alter_column('players', 'name', server_default=None)

    # 4. Drop the new columns
    op.drop_column('players', 'last_name')
    op.drop_column('players', 'first_name')

