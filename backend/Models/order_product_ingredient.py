import json
from ..Infrastructure.SQLServerConnection import *
from .product_ingredient import ProductIngredient


class RecordNotFoundException(Exception):
    pass

# -------------------------
# ATTRIBUTES
# -------------------------
class OrderProductIngredient:
    def __init__(self, *args):
        self._id = 0
        self._order_product_id = 0
        self._product_ingredient_id = 0
        self._quantity = 1
        self._status = 1
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 6:
            (
                self._id,
                self._order_product_id,
                self._product_ingredient_id,
                self._quantity,
                self._status,
                self._created_at
            ) = args

    # -------------------------
    # PROPERTIES
    # -------------------------
    @property
    def id(self):
        return self._id

    @property
    def order_product_id(self):
        return self._order_product_id

    @order_product_id.setter
    def order_product_id(self, value):
        self._order_product_id = value

    @property
    def product_ingredient_id(self):
        return self._product_ingredient_id

    @product_ingredient_id.setter
    def product_ingredient_id(self, value):
        self._product_ingredient_id = value

    @property
    def quantity(self):
        return self._quantity

    @quantity.setter
    def quantity(self, value):
        self._quantity = value

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, value):
        self._status = value

    @property
    def created_at(self):
        return self._created_at

    # --------------------------
    # METHODS
    # -------------------------

    # GET BY ORDER_PRODUCT_ID
    # -------------------------
    @staticmethod
    def get_by_order_product_id(order_product_id, conn):
        result = []
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, Order_Product_Id, Product_Ingredient_Id, Quantity, Status, Created_At
                FROM Order_Product_Ingredients
                WHERE Order_Product_Id = ?
            """, order_product_id)

            for row in cursor.fetchall():
                (
                    _id,
                    _order_product_id,
                    _product_ingredient_id,
                    _quantity,
                    _status,
                    _created_at
                ) = row

                pi = ProductIngredient(_product_ingredient_id)

                result.append({
                    "id": _id,
                    "order_product_id": _order_product_id,
                    "product_ingredient_id": _product_ingredient_id,
                    "quantity": _quantity,
                    "status": _status,
                    "created_at": _created_at.isoformat() if _created_at else None,

                    # 🔥 agregado sin romper estructura
                    "product_ingredient": pi.to_dict() if hasattr(pi, "to_dict") else None
                })

        except Exception as ex:
            raise ex

        return result

    # GET BY ID
    # -------------------------
    def load_by_id(self, id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Order_Product_Id, Product_Ingredient_Id, Quantity, Status, Created_At
                    FROM Order_Product_Ingredients
                    WHERE Id = ?
                """, id)

                row = cursor.fetchone()
                if row:
                    (
                        self._id,
                        self._order_product_id,
                        self._product_ingredient_id,
                        self._quantity,
                        self._status,
                        self._created_at
                    ) = row
                else:
                    raise RecordNotFoundException(f"Record with id {id} was not found.")
        except Exception as e:
            raise e

    # GET ALL
    # -------------------------
    @staticmethod
    def get_all():
        list = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Order_Product_Id, Product_Ingredient_Id, Quantity, Status, Created_At
                    FROM Order_Product_Ingredients
                    ORDER BY Id DESC
                """)
                for row in cursor.fetchall():
                    list.append(OrderProductIngredient(*row))
        except Exception as ex:
            print("error fetching order_product_ingredients...", ex)
        return list

    # -------------------------
    # JSON
    # -------------------------
    def to_json(self):
        return json.dumps({
            "id": self._id,
            "order_product_id": self._order_product_id,
            "product_ingredient_id": self._product_ingredient_id,
            "quantity": self._quantity,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # INSERT
    # -------------------------
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Order_Product_Ingredients 
                    (Order_Product_Id, Product_Ingredient_Id, Quantity, Status)
                    VALUES (?, ?, ?, ?)
                """, (
                    self._order_product_id,
                    self._product_ingredient_id,
                    self._quantity,
                    self._status
                ))
                conn.commit()
        except Exception as ex:
            raise ex
            