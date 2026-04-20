import json
from flask import jsonify, Blueprint, request

from backend.Models.order import Order, RecordNotFoundException
from backend.Infrastructure.SQLServerConnection import SQLServerConnection

from ..Security.Auth import require_auth

order_bp = Blueprint('order_bp', __name__)

# GET ALL
# -------------------------
@order_bp.route('/orders', methods=['GET'])
# @require_auth  
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

# GET BY USER ID
# -------------------------
@order_bp.route('/orders/user/<int:user_id>', methods=['GET'])
# @require_auth  
def get_orders_by_user_id(user_id):
    try:
        with SQLServerConnection.get_connection() as conn:
            orders = Order.get_by_user_id(user_id, conn)

            return jsonify({
                "status": 0,
                "data": orders
            })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# GET BY ORDER ID
# -------------------------
@order_bp.route('/order/<int:order_id>', methods=['GET'])
# @require_auth  
def get_order_by_id(order_id):
    try:
        with SQLServerConnection.get_connection() as conn:
            o = Order(order_id) 

            return jsonify({
                "status": 0,
                "data": o.details(conn)
            })

    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# POST
# -------------------------
@order_bp.route('/order', methods=['POST'])
# @require_auth
def create_order():
    try:
        data = request.get_json()

        o = Order()
        o.user_id = data.get("user_id")
        o.total = data.get("total")
        o.status = data.get("status", "pending")

        order_id = o.add()

        return jsonify({
            "status": 0,
            "message": "Order created successfully",
            "data": {
                "id": order_id
            }
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# PUT
# -------------------------
@order_bp.route('/order/<int:order_id>', methods=['PUT'])
# @require_auth
def update_order(order_id):
    try:
        data = request.get_json()

        o = Order(order_id) 

        if "user_id" in data:
            o.user_id = data.get("user_id")

        if "total" in data:
            o.total = data.get("total")

        if "status" in data:
            o.status = data.get("status")

        o.update()

        return jsonify({
            "status": 0,
            "message": "Order updated successfully"
        })

    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })