from .base import db, BaseModel, gen_id
from sqlalchemy import Table, Column, String, ForeignKey
from sqlalchemy.orm import relationship
from .permission import Permission

# Association table for role <-> permission
role_permissions = db.Table(
    'role_permissions',
    db.Column('role_id', db.String(50), db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.String(50), db.ForeignKey('permissions.id'), primary_key=True)
)


class Role(BaseModel):
    __tablename__ = 'roles'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('role'))
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_system = db.Column(db.Boolean, default=False)

    permissions = relationship('Permission', secondary=role_permissions, backref='roles')

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
