# Production Gunicorn Configuration
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 50

# Restart workers after this many requests, to help prevent memory leaks
preload_app = True

# Logging
accesslog = "/app/logs/gunicorn_access.log"
errorlog = "/app/logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "pipelinepro"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
tmp_upload_dir = "/tmp"

# SSL (uncomment if using HTTPS)
# keyfile = "/app/ssl/key.pem"
# certfile = "/app/ssl/cert.pem"

# Environment variables
raw_env = [
    'FLASK_ENV=production',
    'PYTHONPATH=/app',
]

# Performance tuning
worker_tmp_dir = "/dev/shm"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Graceful shutdown
graceful_timeout = 30

# User and group
user = "pipeline"
group = "pipeline"

# Worker lifecycle
def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    worker.log.info("worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def worker_abort(worker):
    worker.log.info("worker received SIGABRT signal")

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def child_exit(server, worker):
    server.log.info("Worker %s exited", worker.pid)

def max_requests_jitter_handler(server, worker):
    server.log.info("Worker %s reached max requests", worker.pid)
