from flask import Flask, render_template, redirect, url_for
import os

app = Flask(__name__)

app.secret_key = "secret_key"

@app.route("/")
def home():
   return '<label>Hello!</label>'

if __name__ == '__main__':
   app.run(debug=True)