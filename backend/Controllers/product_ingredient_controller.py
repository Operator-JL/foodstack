from flask import jsonify, Blueprint, request
import json

from backend.Models.product_ingredient import ProductIngredient
from ..Security.Auth import require_auth

product_ingredient_bp = Blueprint('product_ingredient_bp', __name__)

#GET
@product_ingredient_bp.route('/product-ingredients', methods=['GET'])
def get_all_product_ingredients():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(pi.to_json()) for pi in ProductIngredient.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@product_ingredient_bp.route('/product-ingredient/<int:id>', methods=['GET'])
def get_product_ingredient_by_id(id):
    try:
        pi = ProductIngredient(id)
        return jsonify({
            "status": 0,
            "data": json.loads(pi.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@product_ingredient_bp.route('/product-ingredient', methods=['POST'])
def create_product_ingredient():
    try:
        data = request.get_json()
        pi = ProductIngredient()

        pi.product_id = data.get("product_id")
        pi.ingredient_id = data.get("ingredient_id")
        pi.max_ingredients = data.get("max_ingredients", 0)
        pi.default_ingredients = data.get("default_ingredients", 0)
        pi.status = data.get("status", 1)

        pi.add()

        return jsonify({
            "status": 0,
            "message": "Product ingredient created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })