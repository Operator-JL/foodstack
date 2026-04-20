import json

from flask import Blueprint, jsonify, request

from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from backend.Models.order import Order, RecordNotFoundException as OrderNotFoundException
from backend.Models.order_product import OrderProduct
from ..Security.Auth import require_auth, require_roles

order_product_bp = Blueprint("order_product_bp", __name__)

STAFF_ROLES = {"admin", "staff", "manager"}


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _is_staff_request():
    role = str(getattr(request, "user_role", "") or "").lower()
    return role in STAFF_ROLES


def _get_json_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, _json_error("JSON body is required.", 400)
    return data, None


def _can_access_order(order_id):
    if _is_staff_request():
        return True

    order = Order(order_id)
    current_user_id = int(getattr(request, "user_id", 0) or 0)
    return int(order.user_id or 0) == current_user_id


# GET ALL
# -------------------------
@order_product_bp.route("/order-products", methods=["GET"])
@require_auth
@require_roles(*STAFF_ROLES)
def get_order_products():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(op.to_json()) for op in OrderProduct.get_all()]
        }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY ID
# -------------------------
@order_product_bp.route("/order-product/<int:record_id>", methods=["GET"])
@order_product_bp.route("/order-products/<int:record_id>", methods=["GET"])
@require_auth
def get_order_product_by_id(record_id):
    try:
        payload = OrderProduct.get_by_id(record_id)
        order_id = int(payload.get("order_id") or 0)
        if order_id <= 0:
            return _json_error("Order reference was not found.", 404)

        if not _can_access_order(order_id):
            return _json_error("Forbidden", 403)

        return jsonify({
            "status": 0,
            "data": payload
        }), 200
    except OrderNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY ORDER ID
# -------------------------
@order_product_bp.route("/order-products/order/<int:order_id>", methods=["GET"])
@require_auth
def get_order_products_by_order_id(order_id):
    try:
        if not _can_access_order(order_id):
            return _json_error("Forbidden", 403)

        with SQLServerConnection.get_connection() as conn:
            return jsonify({
                "status": 0,
                "data": OrderProduct.get_by_order_id(order_id, conn)
            }), 200
    except OrderNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# POST
# --------------------------
@order_product_bp.route("/order-product", methods=["POST"])
@order_product_bp.route("/order-products", methods=["POST"])
@require_auth
def create_order_product():
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        try:
            order_id = int(data.get("order_id"))
            product_id = int(data.get("product_id"))
            quantity = int(data.get("quantity", 1))
            price = float(data.get("price"))
        except Exception:
            return _json_error("order_id, product_id, quantity and price must be numeric.", 400)

        if quantity <= 0:
            return _json_error("quantity must be greater than zero.", 400)

        if not _can_access_order(order_id):
            return _json_error("Forbidden", 403)

        op = OrderProduct()
        op.order_id = order_id
        op.product_id = product_id
        op.quantity = quantity
        op.price = price
        op.status = int(data.get("status", 1))

        new_id = op.add()

        return jsonify({
            "status": 0,
            "message": "Order product created successfully",
            "data": {
                "id": new_id
            }
        }), 201
    except OrderNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# PUT
# --------------------------
@order_product_bp.route("/order-product/<int:record_id>", methods=["PUT"])
@order_product_bp.route("/order-products/<int:record_id>", methods=["PUT"])
@require_auth
@require_roles(*STAFF_ROLES)
def update_order_product(record_id):
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        op = OrderProduct(record_id)

        if "order_id" in data:
            op.order_id = int(data.get("order_id"))
        if "product_id" in data:
            op.product_id = int(data.get("product_id"))
        if "quantity" in data:
            op.quantity = int(data.get("quantity"))
        if "price" in data:
            op.price = float(data.get("price"))
        if "status" in data:
            op.status = int(data.get("status"))

        op.update()

        return jsonify({
            "status": 0,
            "message": "Order product updated successfully"
        }), 200
    except ValueError:
        return _json_error("Numeric field is invalid.", 400)
    except Exception as ex:
        return _json_error(str(ex), 500)
