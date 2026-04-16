import json
from ..Infrastructure.SQLServerConnection import *

class RecordNotFoundException(Exception):
    pass

class ProductIngredient:
    def __init__(self, *args):
        self._id = 0
        self._product_id = 0
        self._ingredient_id = 0
        self._max_ingredients = 0
        self._default_ingredients = 0
        self._status = 1
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 7:
            (
                self._id,
                self._product_id,
                self._ingredient_id,
                self._max_ingredients,
                self._default_ingredients,
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
    def product_id(self):
        return self._product_id
    @product_id.setter
    def product_id(self, value):
        self._product_id = value

    @property
    def ingredient_id(self):
        return self._ingredient_id
    @ingredient_id.setter
    def ingredient_id(self, value):
        self._ingredient_id = value

    @property
    def max_ingredients(self):
        return self._max_ingredients
    @max_ingredients.setter
    def max_ingredients(self, value):
        self._max_ingredients = value

    @property
    def default_ingredients(self):
        return self._default_ingredients
    @default_ingredients.setter
    def default_ingredients(self, value):
        self._default_ingredients = value

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
    def load_by_id(self, id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Product_Id, Ingredient_Id, Max_Ingredients, Default_Ingredients, Status, Created_At
                    FROM Product_Ingredients
                    WHERE Id = ?
                """, id)

                row = cursor.fetchone()
                if row:
                    (
                        self._id,
                        self._product_id,
                        self._ingredient_id,
                        self._max_ingredients,
                        self._default_ingredients,
                        self._status,
                        self._created_at
                    ) = row
                else:
                    raise RecordNotFoundException(f"Record with id {id} was not found.")
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
                    SELECT Id, Product_Id, Ingredient_Id, Max_Ingredients, Default_Ingredients, Status, Created_At
                    FROM Product_Ingredients
                    ORDER BY Id
                """)
                for row in cursor.fetchall():
                    list.append(ProductIngredient(*row))
        except Exception as ex:
            print("error fetching product_ingredients...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "product_id": self._product_id,
            "ingredient_id": self._ingredient_id,
            "max_ingredients": self._max_ingredients,
            "default_ingredients": self._default_ingredients,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # INSERT
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Product_Ingredients 
                    (Product_Id, Ingredient_Id, Max_Ingredients, Default_Ingredients, Status)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    self._product_id,
                    self._ingredient_id,
                    self._max_ingredients,
                    self._default_ingredients,
                    self._status
                ))
                conn.commit()
        except Exception as ex:
            raise ex