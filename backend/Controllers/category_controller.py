import json
import re

from flask import Blueprint, jsonify, request

from backend.Models.category import Category, RecordNotFoundException
from ..Security.Auth import require_auth, require_roles

category_bp = Blueprint('category_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}
FORBIDDEN_CATEGORY_NAMES = {
    "test", "demo", "tmp", "temp", "sample", "foo", "bar", "lorem", "ipsum",
    "none", "null", "n/a", "jose"
}
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
REAL_CATALOG_ORDER = ["Burgers", "Tacos", "Burritos", "Drinks", "Sides"]


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _normalize_category_name(raw_name):
    name = re.sub(r"\s+", " ", str(raw_name or "").strip())
    if not name:
        raise ValueError("name is required.")
    if len(name) < 3 or len(name) > 40:
        raise ValueError("name must be between 3 and 40 characters.")
    if name.lower() in FORBIDDEN_CATEGORY_NAMES:
        raise ValueError("name is not allowed.")
    if not re.fullmatch(r"[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F &'/-]*", name):
        raise ValueError("name has invalid characters.")

    key = re.sub(r"[^a-z0-9]+", "", name.lower())
    normalized = REAL_CATALOG_CATEGORY_MAP.get(key) or REAL_CATALOG_CATEGORY_MAP.get(name.lower())
    if not normalized:
        raise ValueError("name must be one of: Burgers, Tacos, Burritos, Drinks, Sides.")

    return normalized


def _normalize_status(value):
    try:
        status = int(value)
    except Exception:
        raise ValueError("status must be numeric.")
    if status not in (0, 1):
        raise ValueError("status must be 0 or 1.")
    return status


@category_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        items = [json.loads(c.to_json()) for c in Category.get_all()]
        filtered = []
        seen_names = set()

        for row in items:
            if int(row.get("status", 0)) != 1:
                continue

            raw_name = str(row.get("name", "")).strip()
            key = re.sub(r"[^a-z0-9]+", "", raw_name.lower())
            normalized = REAL_CATALOG_CATEGORY_MAP.get(key) or REAL_CATALOG_CATEGORY_MAP.get(raw_name.lower())
            if not normalized:
                continue
            if normalized in seen_names:
                continue

            row["name"] = normalized
            filtered.append(row)
            seen_names.add(normalized)

        filtered.sort(
            key=lambda row: REAL_CATALOG_ORDER.index(row["name"])
            if row.get("name") in REAL_CATALOG_ORDER
            else len(REAL_CATALOG_ORDER)
        )

        return jsonify({
            "status": 0,
            "data": filtered
        })
    except Exception as e:
        return _json_error(str(e), 500)


@category_bp.route('/category/<int:category_id>', methods=['GET'])
@category_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category_by_id(category_id):
    try:
        c = Category(category_id)
        return jsonify({
            "status": 0,
            "data": json.loads(c.to_json())
        })
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except Exception as e:
        return _json_error(str(e), 500)


@category_bp.route('/category', methods=['POST'])
@category_bp.route('/categories', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_category():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)

        c = Category()
        name = _normalize_category_name(data.get("name"))

        if Category.exists_by_name(name):
            return _json_error("Category name already exists.", 409)

        status = _normalize_status(data.get("status", 1))

        c.name = name
        c.status = status
        c.add()

        return jsonify({
            "status": 0,
            "message": "Category created successfully"
        }), 201
    except ValueError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(str(e), 500)


@category_bp.route('/category/<int:category_id>', methods=['PUT'])
@category_bp.route('/categories/<int:category_id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_category(category_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _json_error("JSON body is required.", 400)
        if not data:
            return _json_error("At least one field is required for update.", 400)

        c = Category(category_id)

        if "name" in data:
            name = _normalize_category_name(data.get("name"))
            if Category.exists_by_name(name, exclude_id=category_id):
                return _json_error("Category name already exists.", 409)
            c.name = name

        if "status" in data:
            c.status = _normalize_status(data.get("status"))

        c.update()

        return jsonify({
            "status": 0,
            "message": "Category updated successfully"
        }), 200
    except RecordNotFoundException as e:
        return _json_error(str(e), 404)
    except ValueError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(str(e), 500)
