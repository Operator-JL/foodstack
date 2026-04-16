#.import json
from ..Infrastructure.SQLServerConnection import *

class RecordNotFoundException(Exception):
    pass

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

    # GET BY ID
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

    # GET ALL
    @staticmethod
    def get_all():
        list = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, User_Id, Total, Datetime, Status, Created_At
                    FROM Orders
                    ORDER BY Id DESC
                """)
                for row in cursor.fetchall():
                    list.append(Order(*row))
        except Exception as ex:
            print("error fetching orders...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "user_id": self._user_id,
            "total": float(self._total),
            "datetime": self._datetime.isoformat() if self._datetime else None,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # INSERT
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Orders (User_Id, Total, Status)
                    VALUES (?, ?, ?)
                """, (
                    self._user_id,
                    self._total,
                    self._status
                ))
                conn.commit()
        except Exception as ex:
            raise ex