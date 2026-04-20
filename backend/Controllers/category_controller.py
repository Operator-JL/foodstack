import json

from flask import Blueprint, jsonify, request

from backend.Models.category import Category
from ..Security.Auth import require_auth, require_roles

category_bp = Blueprint('category_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}

#GET
@category_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(c.to_json()) for c in Category.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@category_bp.route('/category/<int:category_id>', methods=['GET'])
@category_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category_by_id(category_id):
    try:
        c = Category(category_id)
        return jsonify({
            "status": 0,
            "data": json.loads(c.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@category_bp.route('/category', methods=['POST'])
@category_bp.route('/categories', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_category():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "status": 1,
                "errorMessage": "JSON body is required."
            }), 400

        c = Category()

        name = str(data.get("name") or "").strip()
        if not name:
            return jsonify({
                "status": 1,
                "errorMessage": "name is required."
            }), 400

        c.name = name
        c.status = int(data.get("status", 1))

        c.add()

        return jsonify({
            "status": 0,
            "message": "Category created successfully"
        }), 201
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 500
