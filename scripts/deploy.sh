#!/bin/bash
# Production Deployment Script for PipLinePro

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pipelinepro"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    log "Backing up database..."
    docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U pipelinepro pipelinepro_prod > "$BACKUP_PATH/database.sql"
    
    # Backup application data
    log "Backing up application data..."
    docker-compose -f "$COMPOSE_FILE" exec -T app tar -czf - /app/instance /app/logs > "$BACKUP_PATH/application_data.tar.gz"
    
    # Backup configuration
    log "Backing up configuration..."
    cp "$COMPOSE_FILE" "$BACKUP_PATH/"
    cp "$ENV_FILE" "$BACKUP_PATH/"
    
    success "Backup created: $BACKUP_PATH"
}

# Pull latest images
pull_images() {
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    success "Images pulled successfully"
}

# Stop services
stop_services() {
    log "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down
    success "Services stopped"
}

# Start services
start_services() {
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    success "Services started"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for database
    log "Waiting for database..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.production.yml exec -T db pg_isready -U pipelinepro; do sleep 2; done'
    
    # Wait for Redis
    log "Waiting for Redis..."
    timeout 30 bash -c 'until docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping; do sleep 2; done'
    
    # Wait for application
    log "Waiting for application..."
    timeout 120 bash -c 'until curl -f http://localhost:8000/health; do sleep 5; done'
    
    success "All services are ready"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T app python -m flask db upgrade
    success "Database migrations completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check application health
    if curl -f http://localhost:8000/health; then
        success "Application health check passed"
    else
        error "Application health check failed"
    fi
    
    # Check database health
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U pipelinepro; then
        success "Database health check passed"
    else
        error "Database health check failed"
    fi
    
    # Check Redis health
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping; then
        success "Redis health check passed"
    else
        error "Redis health check failed"
    fi
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;
    
    success "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting deployment of $PROJECT_NAME..."
    
    check_prerequisites
    create_backup
    pull_images
    stop_services
    start_services
    wait_for_services
    run_migrations
    health_check
    cleanup
    
    success "Deployment completed successfully!"
    log "Application is available at: http://localhost:8000"
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_* | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to: $LATEST_BACKUP"
    
    # Stop current services
    stop_services
    
    # Restore database
    log "Restoring database..."
    docker-compose -f "$COMPOSE_FILE" up -d db
    sleep 10
    docker-compose -f "$COMPOSE_FILE" exec -T db psql -U pipelinepro -d pipelinepro_prod -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker-compose -f "$COMPOSE_FILE" exec -T db psql -U pipelinepro -d pipelinepro_prod < "$LATEST_BACKUP/database.sql"
    
    # Restore application data
    log "Restoring application data..."
    docker-compose -f "$COMPOSE_FILE" exec -T app tar -xzf - < "$LATEST_BACKUP/application_data.tar.gz"
    
    # Start services
    start_services
    wait_for_services
    health_check
    
    success "Rollback completed successfully!"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    backup)
        check_prerequisites
        create_backup
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|backup|health}"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback to previous version"
        echo "  backup   - Create backup only"
        echo "  health   - Perform health check only"
        exit 1
        ;;
esac
