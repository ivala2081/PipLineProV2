"""
API Documentation endpoints for PipLinePro
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
import logging

logger = logging.getLogger(__name__)

docs_api = Blueprint('docs_api', __name__)

@docs_api.route('/')
def api_documentation():
    """Main API documentation endpoint"""
    return jsonify({
        "title": "PipLinePro API Documentation",
        "version": "1.0.0",
        "description": "Comprehensive API documentation for PipLinePro Treasury Management System",
        "endpoints": {
            "authentication": {
                "login": "POST /api/v1/auth/login",
                "logout": "POST /api/v1/auth/logout", 
                "register": "POST /api/v1/auth/register",
                "check": "GET /api/v1/auth/check",
                "csrf_token": "GET /api/v1/auth/csrf-token"
            },
            "transactions": {
                "list": "GET /api/v1/transactions/",
                "create": "POST /api/v1/transactions/",
                "get": "GET /api/v1/transactions/{id}",
                "update": "PUT /api/v1/transactions/{id}",
                "delete": "DELETE /api/v1/transactions/{id}",
                "psp_summary": "GET /api/v1/transactions/psp_summary_stats",
                "psp_monthly": "GET /api/v1/transactions/psp_monthly_stats",
                "clients": "GET /api/v1/transactions/clients"
            },
            "analytics": {
                "dashboard_stats": "GET /api/v1/analytics/dashboard/stats",
                "ledger_data": "GET /api/v1/analytics/ledger-data",
                "system_performance": "GET /api/v1/analytics/system/performance",
                "data_quality": "GET /api/v1/analytics/data/quality",
                "security_metrics": "GET /api/v1/analytics/security/metrics",
                "commission_analytics": "GET /api/v1/analytics/commission/analytics",
                "clients_analytics": "GET /api/v1/analytics/clients/analytics",
                "psp_rollover": "GET /api/v1/analytics/psp-rollover-summary"
            },
            "performance": {
                "metrics": "GET /api/v1/performance/metrics",
                "cache_stats": "GET /api/v1/performance/cache/stats",
                "clear_cache": "POST /api/v1/performance/cache/clear",
                "query_stats": "GET /api/v1/performance/queries/stats",
                "optimize_queries": "POST /api/v1/performance/queries/optimize",
                "security_metrics": "GET /api/v1/performance/security/metrics",
                "health": "GET /api/v1/performance/health"
            },
            "health": {
                "basic": "GET /api/v1/health/",
                "detailed": "GET /api/v1/health/detailed"
            },
            "exchange_rates": {
                "current": "GET /api/v1/exchange-rates/current",
                "rates": "GET /api/v1/exchange-rates/rates",
                "update": "POST /api/v1/exchange-rates/update"
            }
        },
        "authentication": {
            "type": "Session-based with CSRF protection",
            "required": "Most endpoints require authentication",
            "headers": {
                "Content-Type": "application/json",
                "X-CSRFToken": "Required for POST/PUT/DELETE requests"
            }
        },
        "response_formats": {
            "success": {
                "status": "200",
                "data": "Requested data",
                "message": "Success message (optional)"
            },
            "error": {
                "status": "4xx/5xx",
                "error": "Error type",
                "message": "Error description"
            }
        }
    })

@docs_api.route('/transactions')
def transactions_docs():
    """Detailed transactions API documentation"""
    return jsonify({
        "endpoint": "/api/v1/transactions/",
        "description": "Transaction management endpoints",
        "methods": {
            "GET": {
                "description": "List transactions with pagination and filtering",
                "parameters": {
                    "page": "Page number (default: 1)",
                    "per_page": "Items per page (default: 20, max: 100)",
                    "sort_by": "Sort field (created_at, amount, date)",
                    "sort_order": "Sort order (asc, desc)",
                    "start_date": "Filter by start date (YYYY-MM-DD)",
                    "end_date": "Filter by end date (YYYY-MM-DD)",
                    "psp": "Filter by PSP name",
                    "client_name": "Filter by client name",
                    "currency": "Filter by currency"
                },
                "response": {
                    "transactions": "Array of transaction objects",
                    "pagination": "Pagination metadata",
                    "total": "Total number of transactions"
                }
            },
            "POST": {
                "description": "Create a new transaction",
                "body": {
                    "amount": "Transaction amount (required)",
                    "currency": "Currency code (required)",
                    "psp": "PSP name (required)",
                    "client_name": "Client name (required)",
                    "date": "Transaction date (YYYY-MM-DD)",
                    "category": "Transaction category",
                    "description": "Transaction description"
                },
                "response": {
                    "transaction": "Created transaction object",
                    "message": "Success message"
                }
            }
        },
        "special_endpoints": {
            "psp_summary_stats": {
                "method": "GET",
                "description": "Get PSP summary statistics with allocations",
                "caching": "5 minutes",
                "response": "Array of PSP statistics with totals and allocations"
            },
            "psp_monthly_stats": {
                "method": "GET", 
                "description": "Get PSP monthly statistics",
                "parameters": {
                    "year": "Year (default: current year)",
                    "month": "Month (default: current month)"
                },
                "caching": "10 minutes",
                "response": "Array of monthly PSP statistics"
            }
        }
    })

@docs_api.route('/analytics')
def analytics_docs():
    """Detailed analytics API documentation"""
    return jsonify({
        "endpoint": "/api/v1/analytics/",
        "description": "Analytics and reporting endpoints",
        "endpoints": {
            "dashboard_stats": {
                "method": "GET",
                "description": "Get comprehensive dashboard statistics",
                "parameters": {
                    "range": "Time range (today, week, month, quarter, year, all)"
                },
                "response": {
                    "revenue": "Revenue analytics",
                    "transactions": "Transaction counts",
                    "psps": "PSP statistics",
                    "trends": "Performance trends"
                }
            },
            "system_performance": {
                "method": "GET",
                "description": "Get system performance metrics",
                "response": {
                    "cpu": "CPU usage percentage",
                    "memory": "Memory usage statistics",
                    "database": "Database performance metrics",
                    "cache": "Cache performance statistics"
                }
            },
            "data_quality": {
                "method": "GET",
                "description": "Get data quality metrics",
                "response": {
                    "completeness": "Data completeness percentage",
                    "accuracy": "Data accuracy metrics",
                    "consistency": "Data consistency checks",
                    "issues": "Data quality issues found"
                }
            }
        }
    })

@docs_api.route('/performance')
def performance_docs():
    """Detailed performance API documentation"""
    return jsonify({
        "endpoint": "/api/v1/performance/",
        "description": "Performance monitoring and optimization endpoints",
        "endpoints": {
            "metrics": {
                "method": "GET",
                "description": "Get comprehensive performance metrics",
                "response": {
                    "system": "System resource usage",
                    "cache": "Cache performance statistics",
                    "queries": "Database query performance",
                    "security": "Security metrics"
                }
            },
            "cache_management": {
                "stats": {
                    "method": "GET",
                    "description": "Get cache statistics"
                },
                "clear": {
                    "method": "POST",
                    "description": "Clear all cache entries"
                }
            },
            "query_optimization": {
                "stats": {
                    "method": "GET", 
                    "description": "Get query performance statistics"
                },
                "optimize": {
                    "method": "POST",
                    "description": "Run query optimization"
                }
            },
            "health": {
                "method": "GET",
                "description": "Get detailed system health status",
                "response": {
                    "status": "Overall health status",
                    "components": "Individual component status",
                    "issues": "Any issues found"
                }
            }
        }
    })

@docs_api.route('/examples')
def api_examples():
    """API usage examples"""
    return jsonify({
        "examples": {
            "get_transactions": {
                "description": "Get paginated transactions",
                "request": {
                    "method": "GET",
                    "url": "/api/v1/transactions/?page=1&per_page=20&sort_by=created_at&sort_order=desc",
                    "headers": {
                        "Authorization": "Session cookie required"
                    }
                },
                "response": {
                    "status": 200,
                    "data": {
                        "transactions": [
                            {
                                "id": 1,
                                "amount": 1000.00,
                                "currency": "TRY",
                                "psp": "SİPAY",
                                "client_name": "Client A",
                                "date": "2025-09-23",
                                "created_at": "2025-09-23T14:24:15Z"
                            }
                        ],
                        "pagination": {
                            "page": 1,
                            "per_page": 20,
                            "total": 100,
                            "pages": 5
                        }
                    }
                }
            },
            "create_transaction": {
                "description": "Create a new transaction",
                "request": {
                    "method": "POST",
                    "url": "/api/v1/transactions/",
                    "headers": {
                        "Content-Type": "application/json",
                        "X-CSRFToken": "csrf_token_here"
                    },
                    "body": {
                        "amount": 2500.00,
                        "currency": "TRY",
                        "psp": "SİPAY",
                        "client_name": "Client B",
                        "date": "2025-09-23",
                        "category": "Payment",
                        "description": "Monthly payment"
                    }
                },
                "response": {
                    "status": 201,
                    "data": {
                        "transaction": {
                            "id": 2,
                            "amount": 2500.00,
                            "currency": "TRY",
                            "psp": "SİPAY",
                            "client_name": "Client B",
                            "date": "2025-09-23",
                            "created_at": "2025-09-23T14:24:15Z"
                        },
                        "message": "Transaction created successfully"
                    }
                }
            },
            "get_analytics": {
                "description": "Get dashboard analytics",
                "request": {
                    "method": "GET",
                    "url": "/api/v1/analytics/dashboard/stats?range=month",
                    "headers": {
                        "Authorization": "Session cookie required"
                    }
                },
                "response": {
                    "status": 200,
                    "data": {
                        "revenue": {
                            "total": 150000.00,
                            "daily": 5000.00,
                            "trend": 12.5
                        },
                        "transactions": {
                            "total": 1500,
                            "daily": 50,
                            "trend": 8.3
                        },
                        "psps": [
                            {
                                "name": "SİPAY",
                                "amount": 75000.00,
                                "percentage": 50.0
                            }
                        ]
                    }
                }
            }
        }
    })

@docs_api.route('/openapi')
def openapi_spec():
    """OpenAPI 3.0 specification"""
    return jsonify({
        "openapi": "3.0.0",
        "info": {
            "title": "PipLinePro API",
            "version": "1.0.0",
            "description": "Treasury Management System API",
            "contact": {
                "name": "PipLinePro Support",
                "email": "support@pipelinepro.com"
            }
        },
        "servers": [
            {
                "url": "http://127.0.0.1:5000/api/v1",
                "description": "Development server"
            }
        ],
        "security": [
            {
                "sessionAuth": []
            }
        ],
        "paths": {
            "/transactions/": {
                "get": {
                    "summary": "List transactions",
                    "parameters": [
                        {
                            "name": "page",
                            "in": "query",
                            "schema": {"type": "integer", "default": 1}
                        },
                        {
                            "name": "per_page", 
                            "in": "query",
                            "schema": {"type": "integer", "default": 20, "maximum": 100}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "transactions": {"type": "array"},
                                            "pagination": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "securitySchemes": {
                "sessionAuth": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": "session"
                }
            }
        }
    })
