import re

from flask import Blueprint, jsonify, request

from backend.Models.ingredient import Ingredient, RecordNotFoundException
from ..Security.Auth import require_auth, require_roles

ingredient_bp = Blueprint('ingredient_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}
FORBIDDEN_INGREDIENT_NAMES = {
    "test", "demo", "tmp", "temp", "sample", "foo", "bar", "lorem", "ipsum",
    "none", "null", "n/a"
}


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _normalize_name(raw_name):
    name = re.sub(r"\s+", " ", str(raw_name or "").strip())
    if len(name) < 2 or len(name) > 60:
        raise ValueError("name must be between 2 and 60 characters.")
    if name.lower() in FORBIDDEN_INGREDIENT_NAMES:
        raise ValueError("name is not allowed.")
    if not re.fullmatch(r"[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .,&'/-]*", name):
        raise ValueError("name has invalid characters.")
    return name


def _normalize_extra_price(raw_extra_price):
    if raw_extra_price in (None, ""):
        return 0.0
    try:
        price = float(raw_extra_price)
    except Exception:
        raise ValueError("extra_price must be numeric.")
    if price < 0 or price > 50:
        raise ValueError("extra_price must be between 0 and 50.")
    return round(price, 2)


def _normalize_status(raw_status, required=False, fallback=1):
    if raw_status is None and not required:
        return fallback
    try:
        status = int(raw_status)
    except Exception:
        raise ValueError("status must be numeric.")
    if status not in (0, 1):
        raise ValueError("status must be 0 or 1.")
    return status


# GET ALL
@ingredient_bp.route('/ingredients', methods=['GET'])
def get_ingredients():
    try:
        return jsonify({
            "status": 0,
            "data": [i.to_dict() for i in Ingredient.get_all()]
        })
    except Exception as e:
        return _json_error(str(e), 500)


# GET BY ID
@ingredient_bp.route('/ingredient/<int:ingredient_id>', methods=['GET'])
@ingredient_bp.route('/ingredients/<int:ingredient_id>', methods=['GET'])
def get_ingredient_by_id(ingredient_id):
    try:
        i = Ingredient(ingredient_id)
        return jsonify({
            "status": 0,
            "data": i.to_dict()
        })
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


# POST
@ingredient_bp.route('/ingredient', methods=['POST'])
@ingredient_bp.route('/ingredients', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_ingredient():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)

        name = _normalize_name(data.get("name"))
        if Ingredient.exists_by_name(name):
            return _json_error("Ingredient name already exists.", 409)

        i = Ingredient()
        i.name = name
        i.extra_price = _normalize_extra_price(data.get("extra_price"))
        i.status = _normalize_status(data.get("status"), required=False, fallback=1)

        new_id = i.add()

        return jsonify({
            "status": 0,
            "message": "Ingredient created successfully",
            "data": {
                "id": new_id
            }
        }), 201
    except ValueError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(str(e), 500)


# PUT
@ingredient_bp.route('/ingredient/<int:ingredient_id>', methods=['PUT'])
@ingredient_bp.route('/ingredients/<int:ingredient_id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_ingredient(ingredient_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)
        if not data:
            return _json_error("At least one field is required for update.", 400)

        i = Ingredient(ingredient_id)

        if "name" in data:
            name = _normalize_name(data.get("name"))
            if Ingredient.exists_by_name(name, exclude_id=ingredient_id):
                return _json_error("Ingredient name already exists.", 409)
            i.name = name

        if "extra_price" in data:
            i.extra_price = _normalize_extra_price(data.get("extra_price"))

        if "status" in data:
            i.status = _normalize_status(data.get("status"), required=True)

        i.update()

        return jsonify({
            "status": 0,
            "message": "Ingredient updated successfully"
        }), 200
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except ValueError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(str(e), 500)
