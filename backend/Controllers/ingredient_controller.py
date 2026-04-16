from flask import jsonify, Blueprint, request
import json

from ..Models.ingredient import Ingredient
from ..Security.Auth import require_auth

ingredient_bp = Blueprint('ingredient_bp', __name__)

#GET
@ingredient_bp.route('/ingredients', methods=['GET'])
def get_ingredients():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(i.to_json()) for i in Ingredient.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@ingredient_bp.route('/ingredient/<int:ingredient_id>', methods=['GET'])
def get_ingredient_by_id(ingredient_id):
    try:
        i = Ingredient(ingredient_id)
        return jsonify({
            "status": 0,
            "data": json.loads(i.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@ingredient_bp.route('/ingredient', methods=['POST'])
def create_ingredient():
    try:
        data = request.get_json()
        i = Ingredient()

        i.name = data.get("name")
        i.extra_price = data.get("extra_price")
        i.status = data.get("status", 1)

        i.add()

        return jsonify({
            "status": 0,
            "message": "Ingredient created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })