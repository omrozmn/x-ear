from sqlalchemy import Column, ForeignKey, String
from .base import db, BaseModel, gen_id
from sqlalchemy.orm import relationship, backref


class UserAppRole(BaseModel):
    __tablename__ = 'user_app_roles'

    id = Column(String(50), primary_key=True, default=lambda: gen_id('uar'))
    user_id = Column(String(50), ForeignKey('users.id'), nullable=False)
    app_id = Column(String(50), ForeignKey('apps.id'), nullable=False)
    role_id = Column(String(50), ForeignKey('roles.id'), nullable=False)

    user = relationship('User', backref=backref('app_roles', lazy='dynamic'))
    app = relationship('App', backref=backref('user_roles', lazy='dynamic'))
    role = relationship('Role')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'app_id', 'role_id', name='uq_user_app_role'),
    )

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'userId': self.user_id,
            'appId': self.app_id,
            'roleId': self.role_id,
            'role': self.role.name if self.role else None
        }
        d.update(base)
        return d
