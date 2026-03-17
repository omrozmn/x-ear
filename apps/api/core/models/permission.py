from sqlalchemy import Column, String, Text
from .base import BaseModel, gen_id


class Permission(BaseModel):
    __tablename__ = 'permissions'

    id = Column(String(50), primary_key=True, default=lambda: gen_id('perm'))
    name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }
        d.update(base)
        return d
