from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from insight_console.database import Base

class User(Base):
    """User model for authentication and authorization"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    firm_id = Column(String, index=True, nullable=False)  # PE firm identifier
    role = Column(String, default="consultant")  # investor, consultant, expert
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
