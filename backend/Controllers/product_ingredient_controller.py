import json

from flask import Blueprint, jsonify, request

from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from backend.Models.ingredient import Ingredient
from backend.Models.product import Product
from backend.Models.product_ingredient import (
    ProductIngredient,
    RecordNotFoundException as ProductIngredientNotFoundException
)
from ..Security.Auth import require_auth, require_roles

product_ingredient_bp = Blueprint('product_ingredient_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _normalize_int(raw_value, field_name, min_value=0):
    try:
        value = int(raw_value)
    except Exception:
        raise ValueError(f"{field_name} must be numeric.")
    if value < min_value:
        raise ValueError(f"{field_name} must be >= {min_value}.")
    return value


def _normalize_boolean_flag(raw_value, field_name):
    if isinstance(raw_value, bool):
        return 1 if raw_value else 0
    text = str(raw_value).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return 1
    if text in {"0", "false", "no", "off", ""}:
        return 0
    raise ValueError(f"{field_name} must be boolean-like (0/1/true/false).")


def _ensure_product_and_ingredient_exist(product_id, ingredient_id):
    if not Product.exists_by_id(product_id):
        raise LookupError("product_id does not exist.")
    if not Ingredient.exists_by_id(ingredient_id):
        raise LookupError("ingredient_id does not exist.")


# GET ALL
@product_ingredient_bp.route('/product-ingredients', methods=['GET'])
def get_all_product_ingredients():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(pi.to_json()) for pi in ProductIngredient.get_all()]
        })
    except Exception as e:
        return _json_error(str(e), 500)


# GET BY ID
@product_ingredient_bp.route('/product-ingredient/<int:id>', methods=['GET'])
@product_ingredient_bp.route('/product-ingredients/<int:id>', methods=['GET'])
def get_product_ingredient_by_id(id):
    try:
        return jsonify({
            "status": 0,
            "data": ProductIngredient.get_by_id(id)
        })
    except ProductIngredientNotFoundException as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


# GET BY PRODUCT ID
@product_ingredient_bp.route('/product-ingredients/product/<int:product_id>', methods=['GET'])
def get_product_ingredients_by_product_id(product_id):
    try:
        if not Product.exists_by_id(product_id):
            return _json_error("product_id does not exist.", 404)
        with SQLServerConnection.get_connection() as conn:
            return jsonify({
                "status": 0,
                "data": ProductIngredient.get_by_product_id(product_id, conn)
            })
    except Exception as e:
        return _json_error(str(e), 500)


# POST
@product_ingredient_bp.route('/product-ingredient', methods=['POST'])
@product_ingredient_bp.route('/product-ingredients', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_product_ingredient():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)

        product_id = _normalize_int(data.get("product_id"), "product_id", min_value=1)
        ingredient_id = _normalize_int(data.get("ingredient_id"), "ingredient_id", min_value=1)
        max_ingredients = _normalize_int(data.get("max_ingredients", 0), "max_ingredients", min_value=0)
        default_ingredients = _normalize_boolean_flag(data.get("default_ingredients", 0), "default_ingredients")
        status = _normalize_int(data.get("status", 1), "status", min_value=0)

        if status not in (0, 1):
            return _json_error("status must be 0 or 1.", 400)
        if default_ingredients == 1 and max_ingredients == 0:
            return _json_error("max_ingredients must be > 0 when default_ingredients is enabled.", 400)
        if max_ingredients > 20:
            return _json_error("max_ingredients must be <= 20.", 400)

        _ensure_product_and_ingredient_exist(product_id, ingredient_id)
        if ProductIngredient.exists_relation(product_id, ingredient_id):
            return _json_error("Product-ingredient relation already exists.", 409)

        pi = ProductIngredient()
        pi.product_id = product_id
        pi.ingredient_id = ingredient_id
        pi.max_ingredients = max_ingredients
        pi.default_ingredients = default_ingredients
        pi.status = status

        new_id = pi.add()

        return jsonify({
            "status": 0,
            "message": "Product ingredient created successfully",
            "id": new_id
        }), 201
    except ValueError as e:
        return _json_error(str(e), 400)
    except LookupError as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


# PUT
@product_ingredient_bp.route('/product-ingredient/<int:id>', methods=['PUT'])
@product_ingredient_bp.route('/product-ingredients/<int:id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_product_ingredient(id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)
        if not data:
            return _json_error("At least one field is required for update.", 400)

        pi = ProductIngredient(id)

        next_product_id = pi.product_id
        next_ingredient_id = pi.ingredient_id

        if "product_id" in data:
            next_product_id = _normalize_int(data.get("product_id"), "product_id", min_value=1)
        if "ingredient_id" in data:
            next_ingredient_id = _normalize_int(data.get("ingredient_id"), "ingredient_id", min_value=1)

        _ensure_product_and_ingredient_exist(next_product_id, next_ingredient_id)
        if ProductIngredient.exists_relation(next_product_id, next_ingredient_id, exclude_id=id):
            return _json_error("Product-ingredient relation already exists.", 409)

        pi.product_id = next_product_id
        pi.ingredient_id = next_ingredient_id

        if "max_ingredients" in data:
            pi.max_ingredients = _normalize_int(data.get("max_ingredients"), "max_ingredients", min_value=0)
            if pi.max_ingredients > 20:
                return _json_error("max_ingredients must be <= 20.", 400)

        if "default_ingredients" in data:
            pi.default_ingredients = _normalize_boolean_flag(data.get("default_ingredients"), "default_ingredients")

        if "status" in data:
            status = _normalize_int(data.get("status"), "status", min_value=0)
            if status not in (0, 1):
                return _json_error("status must be 0 or 1.", 400)
            pi.status = status

        if int(pi.default_ingredients or 0) == 1 and int(pi.max_ingredients or 0) == 0:
            return _json_error("max_ingredients must be > 0 when default_ingredients is enabled.", 400)

        pi.update()

        return jsonify({
            "status": 0,
            "message": "Product ingredient updated successfully"
        }), 200
    except ProductIngredientNotFoundException as e:
        return _json_error(str(e), 404)
    except ValueError as e:
        return _json_error(str(e), 400)
    except LookupError as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)
