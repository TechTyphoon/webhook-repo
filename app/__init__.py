import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.extensions import mongo
from app.webhook.routes import webhook

load_dotenv()


def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret')
    app.config['MONGO_URI'] = os.getenv('MONGO_URI')

    # Initialize extensions
    mongo.init_app(app)
    CORS(app)

    # Ensure a descending index on timestamp for efficient polling queries
    with app.app_context():
        mongo.db.events.create_index([("timestamp", -1)])

    # Register blueprints
    app.register_blueprint(webhook)

    # Serve the UI
    @app.route('/')
    def index():
        from flask import render_template
        return render_template('index.html')

    return app
