import json

from flask import Blueprint, jsonify, make_response, request

from ..Infrastructure.SQLServerConnection import SQLServerConnection
from ..Security.Auth import generate_token, require_auth, require_roles
from backend.Models.user import RecordNotFoundException, User

user_bp = Blueprint("user_bp", __name__)

STAFF_ROLES = {"admin", "staff", "manager"}


def _json_error(message, http_status=400, status=1):
    return jsonify({
        "status": status,
        "errorMessage": message
    }), http_status


def _is_staff_role(role):
    return str(role or "").strip().lower() in STAFF_ROLES


def _current_user_is_staff():
    return _is_staff_role(getattr(request, "user_role", ""))


def _get_json_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, _json_error("JSON body is required.", 400)
    return data, None


def _validate_email(value):
    email = str(value or "").strip().lower()
    if not email or "@" not in email:
        return None
    return email


def _validate_required_text(value):
    normalized = str(value or "").strip()
    return normalized if normalized else None


def _normalize_role(value):
    role = str(value or "").strip().lower()
    return role if role else None


# GET ALL
# -------------------------
@user_bp.route("/users", methods=["GET"])
@require_auth
@require_roles(*STAFF_ROLES)
def get_users():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(u.to_json()) for u in User.get_all()]
        }), 200
    except Exception as ex:
        return _json_error(str(ex), 500)


# GET BY USER ID
# -------------------------
@user_bp.route("/user/<int:user_id>", methods=["GET"])
@user_bp.route("/users/<int:user_id>", methods=["GET"])
@require_auth
def get_user_with_orders(user_id):
    try:
        if not _current_user_is_staff() and int(getattr(request, "user_id", 0) or 0) != user_id:
            return _json_error("Forbidden", 403)

        with SQLServerConnection.get_connection() as conn:
            u = User()
            u.id = user_id
            return jsonify({
                "status": 0,
                "data": u.details(conn)
            }), 200
    except RecordNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# SIGNUP (PUBLIC)
# -------------------------
@user_bp.route("/user", methods=["POST"])
@user_bp.route("/users", methods=["POST"])
def create_user():
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    name = _validate_required_text(data.get("name"))
    lastname = _validate_required_text(data.get("lastname"))
    phone = _validate_required_text(data.get("phoneNumber"))
    email = _validate_email(data.get("email"))
    password = _validate_required_text(data.get("password"))

    if not name or not lastname or not phone or not email or not password:
        return _json_error(
            "name, lastname, phoneNumber, email and password are required.",
            400
        )

    try:
        u = User()
        u.name = name
        u.lastname = lastname
        u.phoneNumber = phone
        u.email = email
        u.password = password

        # Public signup is always customer to prevent privilege escalation.
        u.role = "customer"
        u.status = 1
        u.add()

        return jsonify({
            "status": 0,
            "message": "User created successfully"
        }), 201
    except Exception as ex:
        return _json_error(str(ex), 500)


# LOGIN
# -------------------------
@user_bp.route("/login", methods=["POST"])
def login():
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    email = _validate_email(data.get("email"))
    password = _validate_required_text(data.get("password"))
    if not email or not password:
        return _json_error("Email and password are required.", 400)

    try:
        u = User.get_by_email(email)
        if not u or not u.check_password(password):
            return _json_error("Invalid credentials.", 401)

        token = generate_token(u.id, u.role)
        user_payload = json.loads(u.to_json())

        response = make_response(jsonify({
            "status": 0,
            "user": user_payload,
            "token": token
        }))

        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=request.is_secure,
            samesite="Lax",
            max_age=60 * 60 * 10
        )
        return response, 200
    except Exception as ex:
        return _json_error(str(ex), 500, status=2)


# SESSION / CURRENT USER
# -------------------------
@user_bp.route("/session", methods=["GET"])
@require_auth
def get_session():
    try:
        user = User(int(request.user_id))
        payload = json.loads(user.to_json())
        return jsonify({
            "status": 0,
            "data": payload
        }), 200
    except RecordNotFoundException as ex:
        return _json_error(str(ex), 404)
    except Exception as ex:
        return _json_error(str(ex), 500)


# LOGOUT
# -------------------------
@user_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({
        "status": 0,
        "message": "Logged Out"
    })
    response.delete_cookie("auth_token")
    return response, 200


# PUT
# -------------------------
@user_bp.route("/user/<int:user_id>", methods=["PUT"])
@user_bp.route("/users/<int:user_id>", methods=["PUT"])
@require_auth
def update_user(user_id):
    data, error_response = _get_json_payload()
    if error_response:
        return error_response

    if not data:
        return _json_error("At least one field is required for update.", 400)

    is_staff = _current_user_is_staff()
    current_user_id = int(getattr(request, "user_id", 0) or 0)
    if not is_staff and current_user_id != user_id:
        return _json_error("Forbidden", 403)

    try:
        u = User(user_id)

        if "name" in data:
            name = _validate_required_text(data.get("name"))
            if not name:
                return _json_error("name cannot be empty.", 400)
            u.name = name

        if "lastname" in data:
            lastname = _validate_required_text(data.get("lastname"))
            if not lastname:
                return _json_error("lastname cannot be empty.", 400)
            u.lastname = lastname

        if "phoneNumber" in data:
            phone = _validate_required_text(data.get("phoneNumber"))
            if not phone:
                return _json_error("phoneNumber cannot be empty.", 400)
            u.phoneNumber = phone

        if "email" in data:
            email = _validate_email(data.get("email"))
            if not email:
                return _json_error("email is invalid.", 400)
            u.email = email

        if "password" in data:
            password = _validate_required_text(data.get("password"))
            if not password:
                return _json_error("password cannot be empty.", 400)
            u.password = password

        if "role" in data:
            if not is_staff:
                return _json_error("Only staff can update role.", 403)
            role = _normalize_role(data.get("role"))
            if not role:
                return _json_error("role cannot be empty.", 400)
            u.role = role

        if "status" in data:
            if not is_staff:
                return _json_error("Only staff can update status.", 403)
            try:
                u.status = int(data.get("status"))
            except Exception:
                return _json_error("status must be numeric.", 400)

        u.update()

        return jsonify({
            "status": 0,
            "message": "User updated successfully"
        }), 200
    except RecordNotFoundException as ex:
        return _json_error(str(ex), 404)
    except ValueError as ex:
        return _json_error(str(ex), 400)
    except Exception as ex:
        return _json_error(str(ex), 500)
