from flask import jsonify, Blueprint, request
import json

from backend.Models.orderProductIngredients import OrderProductIngredient
from ..Security.Auth import require_auth

order_product_ingredient_bp = Blueprint('order_product_ingredient_bp', __name__)

#GET
@order_product_ingredient_bp.route('/order-product-ingredients', methods=['GET'])
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(opi.to_json()) for opi in OrderProductIngredient.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@order_product_ingredient_bp.route('/order-product-ingredient/<int:id>', methods=['GET'])
def get_by_id(id):
    try:
        opi = OrderProductIngredient(id)
        return jsonify({
            "status": 0,
            "data": json.loads(opi.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@order_product_ingredient_bp.route('/order-product-ingredient', methods=['POST'])
def create():
    try:
        data = request.get_json()
        opi = OrderProductIngredient()

        opi.order_product_id = data.get("order_product_id")
        opi.ingredient_id = data.get("ingredient_id")
        opi.quantity = data.get("quantity", 1)
        opi.status = data.get("status", 1)

        opi.add()

        return jsonify({
            "status": 0,
            "message": "Order product ingredient created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })