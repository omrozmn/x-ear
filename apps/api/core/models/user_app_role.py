from .base import db, BaseModel, gen_id
from sqlalchemy.orm import relationship


class UserAppRole(BaseModel):
    __tablename__ = 'user_app_roles'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('uar'))
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    app_id = db.Column(db.String(50), db.ForeignKey('apps.id'), nullable=False)
    role_id = db.Column(db.String(50), db.ForeignKey('roles.id'), nullable=False)

    user = relationship('User', backref=db.backref('app_roles', lazy='dynamic'))
    app = relationship('App', backref=db.backref('user_roles', lazy='dynamic'))
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
