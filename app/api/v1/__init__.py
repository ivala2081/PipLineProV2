"""
API v1 Blueprint Registration
"""
from flask import Blueprint
from app.api.v1.endpoints import transactions, analytics, users, health, translations, exchange_rates, currency_management, database, performance, bulk_rates, docs, realtime_analytics, ai_analysis

# Create the main API v1 blueprint
api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Register endpoint blueprints
api_v1.register_blueprint(transactions.transactions_api, url_prefix='/transactions')
api_v1.register_blueprint(analytics.analytics_api, url_prefix='/analytics')
api_v1.register_blueprint(users.users_api, url_prefix='/users')
api_v1.register_blueprint(health.health_api, url_prefix='/health')
api_v1.register_blueprint(translations.translations_bp, url_prefix='/translations')
api_v1.register_blueprint(exchange_rates.exchange_rates_bp, url_prefix='/exchange-rates')
api_v1.register_blueprint(currency_management.currency_management_api, url_prefix='/currency')
api_v1.register_blueprint(database.database_api, url_prefix='/database')
api_v1.register_blueprint(performance.performance_api, url_prefix='/performance')
api_v1.register_blueprint(docs.docs_api, url_prefix='/docs')
api_v1.register_blueprint(realtime_analytics.realtime_analytics_api, url_prefix='/realtime')
api_v1.register_blueprint(ai_analysis.ai_analysis_api, url_prefix='/ai')
api_v1.register_blueprint(bulk_rates.bulk_rates_bp)

@api_v1.route("/")
def api_root():
    """API root endpoint"""
    return {
        "message": "PipLine Treasury System API v1",
        "version": "1.0.0",
        "status": "active"
    }