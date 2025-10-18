from .base import db, BaseModel, gen_id
from sqlalchemy.orm import relationship


class App(BaseModel):
    __tablename__ = 'apps'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('app'))
    name = db.Column(db.String(150), nullable=False)
    slug = db.Column(db.String(80), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)

    # Owner is a user id reference (nullable during creation)
    owner_user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    owner = relationship('User', backref=db.backref('owned_apps', lazy='dynamic'))

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
