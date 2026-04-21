import re

from flask import Blueprint, jsonify, request

from backend.Models.category import Category, RecordNotFoundException as CategoryNotFoundException
from backend.Models.product import Product, RecordNotFoundException
from ..Security.Auth import require_auth, require_roles

product_bp = Blueprint('product_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}
MIN_PRICE = 0.5
MAX_PRICE = 99.99
REAL_CATALOG_CATEGORY_MAP = {
    "burger": "Burgers",
    "burgers": "Burgers",
    "taco": "Tacos",
    "tacos": "Tacos",
    "burrito": "Burritos",
    "burritos": "Burritos",
    "drink": "Drinks",
    "drinks": "Drinks",
    "side": "Sides",
    "sides": "Sides"
}


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _normalize_name(raw_name):
    name = re.sub(r"\s+", " ", str(raw_name or "").strip())
    if len(name) < 3 or len(name) > 80:
        raise ValueError("name must be between 3 and 80 characters.")
    if not re.fullmatch(r"[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F .,&'/-]*", name):
        raise ValueError("name has invalid characters.")
    return name


def _normalize_description(raw_description, required=False):
    description = re.sub(r"\s+", " ", str(raw_description or "").strip())
    if not description and not required:
        return ""
    if not description:
        raise ValueError("description is required.")
    if len(description) < 8 or len(description) > 500:
        raise ValueError("description must be between 8 and 500 characters.")
    return description


def _normalize_image(raw_image, required=False):
    image = str(raw_image or "").strip()
    if not image and not required:
        return ""
    if not image:
        raise ValueError("image is required.")
    if len(image) > 500:
        raise ValueError("image is too long.")

    lowered = image.lower()
    if lowered.startswith("javascript:") or lowered.startswith("data:text/html"):
        raise ValueError("image has an invalid URL scheme.")

    return image


def _normalize_price(raw_price):
    try:
        price = float(raw_price)
    except Exception:
        raise ValueError("price must be numeric.")
    if price < MIN_PRICE or price > MAX_PRICE:
        raise ValueError(f"price must be between {MIN_PRICE:.2f} and {MAX_PRICE:.2f}.")
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


def _canonical_catalog_category(raw_name):
    cleaned = re.sub(r"\s+", " ", str(raw_name or "").strip()).lower()
    key = re.sub(r"[^a-z0-9]+", "", cleaned)
    return REAL_CATALOG_CATEGORY_MAP.get(key) or REAL_CATALOG_CATEGORY_MAP.get(cleaned)


def _normalize_category_id(raw_category_id):
    try:
        category_id = int(raw_category_id)
    except Exception:
        raise ValueError("category_id must be numeric.")

    if category_id <= 0:
        raise ValueError("category_id must be a positive integer.")

    try:
        category = Category(category_id)
    except CategoryNotFoundException:
        raise LookupError("category_id does not exist.")

    if int(category.status) != 1:
        raise LookupError("category_id is inactive.")

    if not _canonical_catalog_category(category.name):
        raise LookupError("category_id is not part of the real catalog.")

    return category_id


@product_bp.route('/products', methods=['GET'])
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": [p.to_dict() for p in Product.get_all()]
        })
    except Exception as e:
        return _json_error(str(e), 500)


@product_bp.route('/product/<int:product_id>', methods=['GET'])
@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        p = Product(product_id)
        return jsonify({
            "status": 0,
            "data": p.to_dict()
        })
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


@product_bp.route('/product', methods=['POST'])
@product_bp.route('/products', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_product():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)

        p = Product()
        p.category_id = _normalize_category_id(data.get("category_id"))
        p.name = _normalize_name(data.get("name"))
        p.description = _normalize_description(data.get("description"), required=False)
        p.image = _normalize_image(data.get("image"), required=False)
        p.price = _normalize_price(data.get("price"))
        p.status = _normalize_status(data.get("status"), required=False, fallback=1)

        new_id = p.add()

        return jsonify({
            "status": 0,
            "message": "Product created successfully",
            "data": {
                "id": new_id
            }
        }), 201
    except ValueError as e:
        return _json_error(str(e), 400)
    except LookupError as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


@product_bp.route('/product/<int:product_id>', methods=['PUT'])
@product_bp.route('/products/<int:product_id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_product(product_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)
        if not data:
            return _json_error("At least one field is required for update.", 400)

        p = Product(product_id)

        if "category_id" in data:
            p.category_id = _normalize_category_id(data.get("category_id"))
        if "name" in data:
            p.name = _normalize_name(data.get("name"))
        if "description" in data:
            p.description = _normalize_description(data.get("description"), required=True)
        if "image" in data:
            p.image = _normalize_image(data.get("image"), required=True)
        if "price" in data:
            p.price = _normalize_price(data.get("price"))
        if "status" in data:
            p.status = _normalize_status(data.get("status"), required=True)

        p.update()

        return jsonify({
            "status": 0,
            "message": "Product updated successfully"
        }), 200
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except ValueError as e:
        return _json_error(str(e), 400)
    except LookupError as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)
