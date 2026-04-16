import json
from ..Infrastructure.SQLServerConnection import *

class RecordNotFoundException(Exception):
    pass

class Category:
    def __init__(self, *args):
        self._id = 0
        self._name = ""
        self._status = 1
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 4:
            self._id, self._name, self._status, self._created_at = args

    @property
    def id(self):
        return self._id
    @id.setter
    def id(self, value):
        self._id = value

    @property
    def name(self):
        return self._name
    @name.setter
    def name(self, value):
        self._name = value

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

    # GET by ID
    def load_by_id(self, category_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT Id, Name, Status, Created_At FROM Categories WHERE Id = ?",
                    category_id
                )
                row = cursor.fetchone()
                if row:
                    self._id, self._name, self._status, self._created_at = row
                else:
                    raise RecordNotFoundException(f"Category with id {category_id} was not found.")
        except Exception as e:
            raise e

    # GET ALL
    @staticmethod
    def get_all():
        list = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT Id, Name, Status, Created_At FROM Categories ORDER BY Name")
                for row in cursor.fetchall():
                    list.append(Category(*row))
        except Exception as ex:
            print("error fetching categories...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "name": self._name,
            "status": self._status,
            "created_at": self._created_at
        })

    # INSERT
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO Categories (Name, Status) VALUES (?, ?)",
                    (self._name, self._status)
                )
                conn.commit()
        except Exception as ex:
            raise ex
