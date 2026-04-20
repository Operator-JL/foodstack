import json

from ..Infrastructure.SQLServerConnection import *
from .order_product import OrderProduct


class RecordNotFoundException(Exception):
    pass

# -------------------------
# ATTRIBUTES
# -------------------------
class Order:
    def __init__(self, *args):
        self._id = 0
        self._user_id = 0
        self._total = 0.0
        self._datetime = None
        self._status = "pending"
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 6:
            (
                self._id,
                self._user_id,
                self._total,
                self._datetime,
                self._status,
                self._created_at
            ) = args

    # -------------------------
    # PROPERTIES
    # -------------------------

    @property
    def id(self):
        return self._id

    @id.setter
    def id(self, value):
        self._id = value

    @property
    def user_id(self):
        return self._user_id

    @user_id.setter
    def user_id(self, value):
        self._user_id = value

    @property
    def total(self):
        return self._total

    @total.setter
    def total(self, value):
        self._total = value

    @property
    def datetime(self):
        return self._datetime

    @datetime.setter
    def datetime(self, value):
        self._datetime = value

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, value):
        self._status = value

    @property
    def created_at(self):
        return self._created_at

    @created_at.setter
    def created_at(self, value):
        self._created_at = value

    # -------------------------
    # METHODS
    # -------------------------

    # GET PRODUCTS (OrderProducts)
    # -------------------------
    def get_products(self, conn):
        try:
            return OrderProduct.get_by_order_id(self._id, conn)
        except Exception as ex:
            raise ex

    # DETAILS (OrderProducts)
    # -------------------------
    def details(self, conn):
        self.load_by_id(self._id)

        products = self.get_products(conn)

        return {
            "id": self._id,
            "user_id": self._user_id,
            "total": float(self._total),
            "datetime": self._datetime.isoformat() if self._datetime else None,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "order_products": products
        }

    # LOAD BY ID
    # -------------------------
    def load_by_id(self, order_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, User_Id, Total, Datetime, Status, Created_At
                    FROM Orders
                    WHERE Id = ?
                """, order_id)

                row = cursor.fetchone()
                if row:
                    (
                        self._id,
                        self._user_id,
                        self._total,
                        self._datetime,
                        self._status,
                        self._created_at
                    ) = row
                else:
                    raise RecordNotFoundException(f"Order with id {order_id} was not found.")

        except Exception as e:
            raise e

    # GET BY USER ID
    # -------------------------
    @staticmethod
    def get_by_user_id(user_id, conn):
        orders = []
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, User_Id, Total, Datetime, Status, Created_At
                FROM Orders
                WHERE User_Id = ?
                ORDER BY Id DESC
            """, user_id)

            for row in cursor.fetchall():
                o = Order(*row)
                orders.append(o.details(conn))

        except Exception as ex:
            raise ex

        return orders

    # GET ALL
    # -------------------------
    @staticmethod
    def get_all():
        orders = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, User_Id, Total, Datetime, Status, Created_At
                    FROM Orders
                    ORDER BY Id DESC
                """)
                for row in cursor.fetchall():
                    orders.append(Order(*row))
        except Exception as ex:
            print("error fetching orders...", ex)
        return orders

    # TO JSON
    # -------------------------
    def to_json(self):
        return json.dumps({
            "id": self._id,
            "user_id": self._user_id,
            "total": float(self._total),
            "datetime": self._datetime.isoformat() if self._datetime else None,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # ADD
    # -------------------------
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Orders (User_Id, Total, Status)
                    OUTPUT INSERTED.Id
                    VALUES (?, ?, ?)
                """, (
                    self._user_id,
                    self._total,
                    self._status
                ))

                self._id = cursor.fetchone()[0]
                conn.commit()

                return self._id

        except Exception as ex:
            raise ex

    # UPDATE
    # -------------------------
    def update(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE Orders
                    SET User_Id = ?, Total = ?, Status = ?
                    WHERE Id = ?
                """, (
                    self._user_id,
                    self._total,
                    self._status,
                    self._id
                ))

                if cursor.rowcount == 0:
                    raise RecordNotFoundException(f"Order with id {self._id} was not found.")

                conn.commit()

        except Exception as ex:
            raise ex