from flask import jsonify, Blueprint, request, make_response
import json

from backend.Models.categories import Category
from ..Security.Auth import require_auth

category_bp = Blueprint('category_bp', __name__)

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
def create_category():
    try:
        data = request.get_json()
        c = Category()

        c.name = data.get("name")
        c.status = data.get("status", 1)

        c.add()

        return jsonify({
            "status": 0,
            "message": "Category created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })