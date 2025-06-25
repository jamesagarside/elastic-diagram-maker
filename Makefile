# Elastic Diagram Maker Makefile

# Variables
NODE_ENV ?= development
NODE_VERSION := $(shell node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
PORT ?= 3000
DOCKER_IMAGE_NAME = elastic-diagram-maker
DOCKER_TAG ?= latest
DOCKER_PORT ?= 3001

# Check if required tools are installed
ifeq ($(shell which node),)
$(error Node.js is not installed. Please visit https://nodejs.org to install)
endif

# Colors for terminal output
CYAN = \033[0;36m
YELLOW = \033[0;33m
GREEN = \033[0;32m
RED = \033[0;31m
NC = \033[0m # No Color

# Main targets
.PHONY: help install reinstall dev build serve prod docker-build docker-run clean-all check-node-version

# Default target
help:
	@echo "${CYAN}Elastic Diagram Maker${NC} - Available commands:"
	@echo ""
	@echo "  ${YELLOW}make install${NC}      - Install all dependencies"
	@echo "  ${YELLOW}make reinstall${NC}    - Force reinstall all dependencies (fixes module issues)"
	@echo "  ${YELLOW}make dev${NC}          - Run in development mode"
	@echo "  ${YELLOW}make build${NC}        - Build the application for production"
	@echo "  ${YELLOW}make serve${NC}        - Serve the built application"
	@echo "  ${YELLOW}make prod${NC}         - Build and serve the application"
	@echo "  ${YELLOW}make docker-build${NC} - Build Docker image"
	@echo "  ${YELLOW}make docker-run${NC}   - Run the application in Docker"
	@echo "  ${YELLOW}make clean-all${NC}    - Remove node_modules, build directory"
	@echo ""
	@echo "You can specify the port for the server using PORT=<port>:"
	@echo "  ${YELLOW}make serve PORT=8080${NC}"
	@echo ""

# Install dependencies
install:
	@echo "${CYAN}Installing dependencies...${NC}"
	npm ci || npm install
	@echo "${GREEN}✓ Dependencies installed successfully${NC}"

# Force reinstall all dependencies
reinstall:
	@echo "${CYAN}Force reinstalling all dependencies...${NC}"
	rm -rf node_modules
	rm -rf package-lock.json
	npm cache clean --force
	npm install
	@echo "${GREEN}✓ Dependencies reinstalled successfully${NC}"

# Run in development mode
dev: server-dev
	@echo "${CYAN}Starting development server on port ${PORT}...${NC}"
	PORT=$(PORT) NODE_ENV=development npx react-scripts start

# Build for production
build: check-node-version
	@echo "${CYAN}Building for production...${NC}"
	NODE_ENV=production npx react-scripts build
	@echo "${GREEN}✓ Build completed successfully${NC}"

# Run server in development mode
server-dev:
	@echo "${CYAN}Starting development server on port ${PORT}...${NC}"
	PORT=$(PORT) npm run server:dev

# Serve the built application
serve:
	@echo "${CYAN}Starting production server on port ${PORT}...${NC}"
	@echo "${YELLOW}Note: Make sure to run 'make build' first if you haven't already${NC}"
	PORT=$(PORT) NODE_ENV=production node server.js

# Build and serve (production mode)
prod: check-node-version build serve

# Docker build
docker-build:
	@echo "${CYAN}Building Docker image: $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)...${NC}"
	docker build -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .
	@echo "${GREEN}✓ Docker image built successfully${NC}"

# Run in Docker
docker-run:
	@echo "${CYAN}Running Docker container on port ${DOCKER_PORT}...${NC}"
	docker run -p $(DOCKER_PORT):3001 --name $(DOCKER_IMAGE_NAME) $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

# Clean up
clean-all:
	@echo "${CYAN}Cleaning up...${NC}"
	rm -rf node_modules/
	rm -rf build/
	@echo "${GREEN}✓ Clean up completed${NC}"

# Check for Node.js version (React Scripts may have issues with Node.js v18+)
check-node-version:
	@echo "${CYAN}Checking Node.js version...${NC}"
	@if [ $(NODE_VERSION) -lt 14 ]; then \
		echo "${RED}Error: Node.js v14 or higher is required (detected v$(NODE_VERSION))${NC}"; \
		exit 1; \
	elif [ $(NODE_VERSION) -gt 18 ]; then \
		echo "${YELLOW}Warning: You're using Node.js v$(NODE_VERSION). Some issues may occur with react-scripts.${NC}"; \
		echo "${YELLOW}Consider using Node.js v16-18 for optimal compatibility.${NC}"; \
	else \
		echo "${GREEN}✓ Node.js version v$(NODE_VERSION) is supported${NC}"; \
	fi
