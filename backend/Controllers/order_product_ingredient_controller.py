import json

from flask import Blueprint, jsonify, request

from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from backend.Models.order import Order
from backend.Models.order_product import OrderProduct
from backend.Models.order_product_ingredient import OrderProductIngredient
from ..Security.Auth import require_auth, require_roles

order_product_ingredient_bp = Blueprint("order_product_ingredient_bp", __name__)

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


def _can_access_order_product(order_product_id):
    if _is_staff_request():
        return True

    order_product = OrderProduct(order_product_id)
    order = Order(order_product.order_id)
    current_user_id = int(getattr(request, "user_id", 0) or 0)
    return int(order.user_id or 0) == current_user_id


# GET ALL
# -------------------------
@order_product_ingredient_bp.route("/order-product-ingredients", methods=["GET"])
@require_auth
@require_roles(*STAFF_ROLES)
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(opi.to_json()) for opi in OrderProductIngredient.get_all()]
        }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY ID
# -------------------------
@order_product_ingredient_bp.route("/order-product-ingredient/<int:record_id>", methods=["GET"])
@order_product_ingredient_bp.route("/order-product-ingredients/<int:record_id>", methods=["GET"])
@require_auth
def get_by_id(record_id):
    try:
        payload = OrderProductIngredient.get_by_id(record_id)
        order_product_id = int(payload.get("order_product_id") or 0)
        if order_product_id <= 0:
            return _json_error("Order product reference was not found.", 404)

        if not _can_access_order_product(order_product_id):
            return _json_error("Forbidden", 403)

        return jsonify({
            "status": 0,
            "data": payload
        }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY ORDER PRODUCT ID
# -------------------------
@order_product_ingredient_bp.route("/order-product-ingredients/order-product/<int:order_product_id>", methods=["GET"])
@require_auth
def get_by_order_product_id(order_product_id):
    try:
        if not _can_access_order_product(order_product_id):
            return _json_error("Forbidden", 403)

        with SQLServerConnection.get_connection() as conn:
            return jsonify({
                "status": 0,
                "data": OrderProductIngredient.get_by_order_product_id(order_product_id, conn)
            }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# POST
# -------------------------
@order_product_ingredient_bp.route("/order-product-ingredient", methods=["POST"])
@order_product_ingredient_bp.route("/order-product-ingredients", methods=["POST"])
@require_auth
def create():
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        order_product_id = int(data.get("order_product_id"))
        product_ingredient_id = int(data.get("product_ingredient_id"))
        quantity = int(data.get("quantity", 1))
        status = int(data.get("status", 1))
    except Exception:
        return _json_error("order_product_id, product_ingredient_id, quantity and status must be numeric.", 400)

    if quantity <= 0:
        return _json_error("quantity must be greater than zero.", 400)

    try:
        if not _can_access_order_product(order_product_id):
            return _json_error("Forbidden", 403)

        opi = OrderProductIngredient()
        opi.order_product_id = order_product_id
        opi.product_ingredient_id = product_ingredient_id
        opi.quantity = quantity
        opi.status = status

        new_id = opi.add()

        return jsonify({
            "status": 0,
            "message": "Order product ingredient created successfully",
            "data": {
                "id": new_id
            }
        }), 201
    except Exception as ex:
        return _json_error(str(ex), 500)


# PUT
# -------------------------
@order_product_ingredient_bp.route("/order-product-ingredient/<int:record_id>", methods=["PUT"])
@order_product_ingredient_bp.route("/order-product-ingredients/<int:record_id>", methods=["PUT"])
@require_auth
@require_roles(*STAFF_ROLES)
def update(record_id):
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        opi = OrderProductIngredient(record_id)
        if "order_product_id" in data:
            opi.order_product_id = int(data.get("order_product_id"))
        if "product_ingredient_id" in data:
            opi.product_ingredient_id = int(data.get("product_ingredient_id"))
        if "quantity" in data:
            opi.quantity = int(data.get("quantity"))
        if "status" in data:
            opi.status = int(data.get("status"))

        opi.update()

        return jsonify({
            "status": 0,
            "message": "Order product ingredient updated successfully"
        }), 200
    except ValueError:
        return _json_error("Numeric field is invalid.", 400)
    except Exception as ex:
        return _json_error(str(ex), 500)
