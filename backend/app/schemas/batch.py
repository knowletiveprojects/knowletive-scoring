from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BatchCreate(BaseModel):
    name: str

class BatchResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True