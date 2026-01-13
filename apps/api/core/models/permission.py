from .base import db, BaseModel, gen_id


class Permission(BaseModel):
    __tablename__ = 'permissions'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('perm'))
    name = db.Column(db.String(150), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }
        d.update(base)
        return d
