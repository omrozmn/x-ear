from sqlalchemy import Column, ForeignKey, String, Text
from core.models.base import Base
from .base import db, BaseModel, gen_id
from sqlalchemy.orm import relationship, backref


class App(BaseModel):
    __tablename__ = 'apps'

    id = Column(String(50), primary_key=True, default=lambda: gen_id('app'))
    name = Column(String(150), nullable=False)
    slug = Column(String(80), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Owner is a user id reference (nullable during creation)
    owner_user_id = Column(String(50), ForeignKey('users.id'), nullable=True)
    owner = relationship('User', backref=backref('owned_apps', lazy='dynamic'))

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'ownerUserId': self.owner_user_id
        }
        d.update(base)
        return d
