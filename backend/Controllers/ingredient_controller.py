from flask import jsonify, Blueprint, request
import json

from backend.Models.ingredient import Ingredient
from ..Security.Auth import require_auth, require_roles

ingredient_bp = Blueprint('ingredient_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}

# GET ALL
# -------------------------
@ingredient_bp.route('/ingredients', methods=['GET'])
def get_ingredients():
    try:
        return jsonify({
            "status": 0,
            "data": [i.to_dict() for i in Ingredient.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# GET BY ID
# -------------------------
@ingredient_bp.route('/ingredient/<int:ingredient_id>', methods=['GET'])
@ingredient_bp.route('/ingredients/<int:ingredient_id>', methods=['GET'])
def get_ingredient_by_id(ingredient_id):
    try:
        i = Ingredient(ingredient_id)
        return jsonify({
            "status": 0,
            "data": i.to_dict()
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# POST
# --------------------------
@ingredient_bp.route('/ingredient', methods=['POST'])
@ingredient_bp.route('/ingredients', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_ingredient():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "status": 1,
                "errorMessage": "JSON body is required."
            }), 400

        name = str(data.get("name") or "").strip()
        if not name:
            return jsonify({
                "status": 1,
                "errorMessage": "name is required."
            }), 400

        i = Ingredient()

        i.name = name
        i.extra_price = data.get("extra_price")
        i.status = int(data.get("status", 1))

        new_id = i.add()

        return jsonify({
            "status": 0,
            "message": "Ingredient created successfully",
            "data": {
                "id": new_id
            }
        }), 201
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 500

# PUT
# --------------------------
@ingredient_bp.route('/ingredient/<int:ingredient_id>', methods=['PUT'])
@ingredient_bp.route('/ingredients/<int:ingredient_id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_ingredient(ingredient_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "status": 1,
                "errorMessage": "JSON body is required."
            }), 400

        i = Ingredient(ingredient_id)

        i.name = data.get("name", i.name)
        i.extra_price = data.get("extra_price", i.extra_price)
        i.status = data.get("status", i.status)

        i.update()

        return jsonify({
            "status": 0,
            "message": "Ingredient updated successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 500
