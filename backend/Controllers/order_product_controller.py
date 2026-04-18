from flask import jsonify, Blueprint, request
import json

from backend.Models.order_product import OrderProduct
from ..Security.Auth import require_auth

order_product_bp = Blueprint('order_product_bp', __name__)

#GET
@order_product_bp.route('/order-products', methods=['GET'])
def get_order_products():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(op.to_json()) for op in OrderProduct.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@order_product_bp.route('/order-product/<int:id>', methods=['GET'])
def get_order_product_by_id(id):
    try:
        op = OrderProduct(id)
        return jsonify({
            "status": 0,
            "data": json.loads(op.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@order_product_bp.route('/order-product', methods=['POST'])
def create_order_product():
    try:
        data = request.get_json()
        op = OrderProduct()

        op.order_id = data.get("order_id")
        op.product_id = data.get("product_id")
        op.quantity = data.get("quantity", 1)
        op.price = data.get("price")
        op.status = data.get("status", 1)

        op.add()

        return jsonify({
            "status": 0,
            "message": "Order product created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })