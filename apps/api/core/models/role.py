from core.models.base import Base
from .base import BaseModel, gen_id
from sqlalchemy import Table, Column, String, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship

# Association table for role <-> permission
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', String(50), ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', String(50), ForeignKey('permissions.id'), primary_key=True)
)


class Role(BaseModel):
    __tablename__ = 'roles'

    id = Column(String(50), primary_key=True, default=lambda: gen_id('role'))
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)

    # Eager loading with subqueryload for better performance on permission fetching
    permissions = relationship(
        'Permission', 
        secondary=role_permissions, 
        backref='roles',
        lazy='subquery'  # Eager load permissions in a single subquery
    )

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'isSystem': self.is_system,
            'permissions': [p.to_dict() for p in self.permissions]
        }
        d.update(base)
        return d
