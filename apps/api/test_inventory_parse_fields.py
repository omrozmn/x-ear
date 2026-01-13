import json
from app import app
from models.inventory import InventoryItem
from .conftest import db_session
from models.base import db


def test_to_dict_handles_malformed_json():
    # Create a malformed inventory item directly in DB
    with app.app_context():
        item = InventoryItem()
        item.id = 'item_malformed_001'
        item.name = 'Malformed Test'
        item.brand = 'TestBrand'
        item.category = 'accessory'
        item.price = 10.0
        item.available_serials = 'SN-ABCDE,SN-12345'
        item.features = 'featureA,featureB'
        db.session.add(item)
        db.session.commit()

        fetched = db.session.get(InventoryItem, item.id)
        assert fetched is not None
        d = fetched.to_dict()
        assert isinstance(d['availableSerials'], list)
        assert d['availableSerials'] == ['SN-ABCDE', 'SN-12345']
        assert isinstance(d['features'], list)
        assert d['features'] == ['featureA', 'featureB']

        # cleanup
        db.session.delete(fetched)
        db.session.commit()
