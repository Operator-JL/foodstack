import json

from flask import Blueprint, jsonify, request

from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from backend.Models.order import Order, RecordNotFoundException
from ..Security.Auth import require_auth, require_roles

order_bp = Blueprint("order_bp", __name__)

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


# GET ALL
# -------------------------
@order_bp.route("/orders", methods=["GET"])
@require_auth
@require_roles(*STAFF_ROLES)
def get_orders():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(o.to_json()) for o in Order.get_all()]
        }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY USER ID
# -------------------------
@order_bp.route("/orders/user/<int:user_id>", methods=["GET"])
@require_auth
def get_orders_by_user_id(user_id):
    try:
        current_user_id = int(getattr(request, "user_id", 0) or 0)
        if not _is_staff_request() and current_user_id != user_id:
            return _json_error("Forbidden", 403)

        with SQLServerConnection.get_connection() as conn:
            orders = Order.get_by_user_id(user_id, conn)
            return jsonify({
                "status": 0,
                "data": orders
            }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY ORDER ID
# -------------------------
@order_bp.route("/order/<int:order_id>", methods=["GET"])
@order_bp.route("/orders/<int:order_id>", methods=["GET"])
@require_auth
def get_order_by_id(order_id):
    try:
        current_user_id = int(getattr(request, "user_id", 0) or 0)
        with SQLServerConnection.get_connection() as conn:
            order = Order(order_id)
            if not _is_staff_request() and int(order.user_id or 0) != current_user_id:
                return _json_error("Forbidden", 403)

            return jsonify({
                "status": 0,
                "data": order.details(conn)
            }), 200
    except RecordNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# POST
# -------------------------
@order_bp.route("/order", methods=["POST"])
@order_bp.route("/orders", methods=["POST"])
@require_auth
def create_order():
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        current_user_id = int(getattr(request, "user_id", 0) or 0)
        incoming_user_id = data.get("user_id")
        if incoming_user_id is None:
            incoming_user_id = current_user_id

        try:
            incoming_user_id = int(incoming_user_id)
        except Exception:
            return _json_error("user_id must be numeric.", 400)

        if incoming_user_id <= 0:
            return _json_error("user_id must be positive.", 400)

        if not _is_staff_request() and incoming_user_id != current_user_id:
            return _json_error("Forbidden", 403)

        try:
            total = float(data.get("total"))
        except Exception:
            return _json_error("total must be numeric.", 400)

        status = str(data.get("status") or "pending").strip().lower()
        if not status:
            status = "pending"

        o = Order()
        o.user_id = incoming_user_id
        o.total = total
        o.status = status

        order_id = o.add()

        return jsonify({
            "status": 0,
            "message": "Order created successfully",
            "data": {
                "id": order_id
            }
        }), 201
    except Exception as ex:
        return _json_error(str(ex), 500)


# PUT
# -------------------------
@order_bp.route("/order/<int:order_id>", methods=["PUT"])
@order_bp.route("/orders/<int:order_id>", methods=["PUT"])
@require_auth
@require_roles(*STAFF_ROLES)
def update_order(order_id):
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    try:
        o = Order(order_id)

        if "user_id" in data:
            try:
                o.user_id = int(data.get("user_id"))
            except Exception:
                return _json_error("user_id must be numeric.", 400)

        if "total" in data:
            try:
                o.total = float(data.get("total"))
            except Exception:
                return _json_error("total must be numeric.", 400)

        if "status" in data:
            status = str(data.get("status") or "").strip().lower()
            if not status:
                return _json_error("status cannot be empty.", 400)
            o.status = status

        o.update()

        return jsonify({
            "status": 0,
            "message": "Order updated successfully"
        }), 200
    except RecordNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)
