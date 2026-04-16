from flask import jsonify, Blueprint, request
import json

from backend.Models.order import Order
from ..Security.Auth import require_auth

order_bp = Blueprint('order_bp', __name__)

#GET
@order_bp.route('/orders', methods=['GET'])
def get_orders():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(o.to_json()) for o in Order.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@order_bp.route('/order/<int:order_id>', methods=['GET'])
def get_order_by_id(order_id):
    try:
        o = Order(order_id)
        return jsonify({
            "status": 0,
            "data": json.loads(o.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@order_bp.route('/order', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        o = Order()

        o.user_id = data.get("user_id")
        o.total = data.get("total")
        o.status = data.get("status", "pending")

        o.add()

        return jsonify({
            "status": 0,
            "message": "Order created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })