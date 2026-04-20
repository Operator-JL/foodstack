from flask import jsonify, Blueprint, request
import json

from backend.Models.order_product_ingredient import OrderProductIngredient

order_product_ingredient_bp = Blueprint('order_product_ingredient_bp', __name__)

# -------------------------
# GET ALL
# -------------------------
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


# -------------------------
# GET BY ID
# -------------------------
@order_product_ingredient_bp.route('/order-product-ingredient/<int:id>', methods=['GET'])
def get_by_id(id):
    try:
        opi = OrderProductIngredient.get_by_id(id)

        return jsonify({
            "status": 0,
            "data": opi
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })


# -------------------------
# CREATE
# -------------------------
@order_product_ingredient_bp.route('/order-product-ingredient', methods=['POST'])
def create():
    try:
        data = request.get_json()

        opi = OrderProductIngredient()
        opi.order_product_id = data.get("order_product_id")
        opi.product_ingredient_id = data.get("product_ingredient_id")
        opi.quantity = data.get("quantity", 1)
        opi.status = data.get("status", 1)

        opi.add()

        return jsonify({
            "status": 0,
            "message": "Order product ingredient created successfully",
            "data": {
                "id": opi.id
            }
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })