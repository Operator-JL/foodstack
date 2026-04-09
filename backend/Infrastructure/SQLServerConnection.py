import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

class SQLServerConnection:
    @staticmethod
    def get_connection():
        server = os.getenv("SQL_SERVER")
        database = os.getenv("DATABASE")
        username = os.getenv("SQL_USER")
        password = os.getenv("SQL_PASSWORD")

        if not server:
            print("Configuration Error: SQL_SERVER not set in .env file")
        if not database:
            print("Configuration Error: SQL_DATABASE not set in .env file")
        if not username:
            print("Configuration Error: SQL_USERNAME not set in .env file")
        if not password:
            print("Configuration Error: SQL_PASSWORD not set in .env file")

        connectionString = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"SERVER=tcp:{server},1433;"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            "TrustServerCertificate=no;"
            "Encrypt=yes;"
            "Connection Timeout=30;"
        )
        try:
            connection = pyodbc.connect(connectionString)
            connection.setencoding("utf8")
            connection.setdecoding(pyodbc.SQL_CHAR,encoding='utf8')
            connection.setdecoding(pyodbc.SQL_WCHAR,encoding='utf8')
        except Exception as ex:
            print("Could not connect to SQL server")
            print(str(ex))
            return None
        return connection



