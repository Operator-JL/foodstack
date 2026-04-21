import json
from flask import jsonify, Blueprint, request, make_response
from backend.Models.user import User, RecordNotFoundException
from ..Security.Auth import require_auth, generate_token

user_bp = Blueprint("user_bp", __name__)

# GET ALL
# -------------------------
@user_bp.route('/users', methods=['GET'])
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": [u.to_dict() for u in User.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# GET BY ID
# -------------------------
@user_bp.route('/user/<int:user_id>', methods=['GET'])
#@require_auth
def get_by_id(user_id):
    try:
        u = User(user_id)
        return jsonify({
            "status": 0,
            "data": u.details(None)
        })
    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# POST
# -------------------------
@user_bp.route('/user', methods=['POST'])
#@require_auth
def create():
    try:
        data = request.get_json()

        u = User()
        u.name = data.get("name")
        u.lastname = data.get("lastname")
        u.phoneNumber = data.get("phoneNumber")
        u.email = data.get("email")
        u.password = data.get("password")
        u.role = data.get("role")
        u.status = data.get("status", 1)

        new_id = u.add()

        return jsonify({
            "status": 0,
            "message": "User created successfully",
            "data": {
                "id": new_id
            }
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# UPDATE
# -------------------------
@user_bp.route('/user/<int:user_id>', methods=['PUT'])
#@require_auth
def update(user_id):
    try:
        data = request.get_json()
        u = User(user_id)

        u.name = data.get("name", u.name)
        u.lastname = data.get("lastname", u.lastname)
        u.phoneNumber = data.get("phoneNumber", u.phoneNumber)
        u.email = data.get("email", u.email)
        u.role = data.get("role", u.role)
        u.status = data.get("status", u.status)

        u.update()

        # 🔥 Update password separately if provided
        if "password" in data and data["password"]:
            u.password = data["password"]
            u.update_password()

        return jsonify({
            "status": 0,
            "message": "User updated successfully"
        })
    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# LOGIN
# -------------------------
@user_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        if not data or "email" not in data or "password" not in data:
            return jsonify({
                "status": 1,
                "errorMessage": "Email and password are required."
            }), 400

        u = User.get_by_email(data["email"])

        if not u or not u.check_password(data["password"]):
            return jsonify({
                "status": 1,
                "errorMessage": "Invalid credentials."
            }), 401

        token = generate_token(u.id)

        response = make_response(jsonify({
            "status": 0,
            "user": u.to_dict()
        }))

        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=False,
            samesite="Lax",
            max_age=60 * 60 * 10
        )

        return response

    except Exception as ex:
        return jsonify({
            "status": 2,
            "errorMessage": str(ex)
        }), 400

# LOGOUT
# -------------------------
@user_bp.route("/logout", methods=["POST"])
#@require_auth
def logout():
    response = jsonify({
        "status": 0,
        "message": "Logged Out"
    })

    response.delete_cookie("auth_token")

    return response