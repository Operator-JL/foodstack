from flask import jsonify, Blueprint, request
import json

from backend.Models.Product import Product
from backend.Models.category import Category
from ..Security.Auth import require_auth

product_bp = Blueprint('product_bp', __name__)

#GET
@product_bp.route('/products', methods=['GET'])
def get_products():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(p.to_json()) for p in Product.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@product_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        p = Product(product_id)

        category = Category(p.category_id)

        data = json.loads(p.to_json())
        data["category"] = json.loads(category.to_json())

        return jsonify({
            "status": 0,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@product_bp.route('/product', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        p = Product()

        p.category_id = data.get("category_id")
        p.name = data.get("name")
        p.description = data.get("description")
        p.image = data.get("image")
        p.price = data.get("price")
        p.status = data.get("status", 1)

        p.add()

        return jsonify({
            "status": 0,
            "message": "Product created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })