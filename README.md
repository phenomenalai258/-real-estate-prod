# Real Estate Project

This is a real estate application with a Next.js frontend and Express backend.

## Docker Setup

### Prerequisites

- Docker and Docker Compose installed on your machine
- Git (to clone the repository)

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd real-estate-prod
   ```

2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your actual configuration values.

4. Build and start the Docker containers:
   ```bash
   docker-compose up -d
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002

### Stopping the Application

```bash
docker-compose down
```

### Development with Docker

For development, you can use the volumes mounted in the docker-compose.yml file. Changes to your code will be reflected in the containers.

### Database Migrations

To run Prisma migrations inside the Docker container:

```bash
docker-compose exec server npx prisma migrate dev
```

### Seeding the Database

To seed the database:

```bash
docker-compose exec server npm run seed
```

## Environment Variables

See `.env.example` for a list of required environment variables.

## Project Structure

- `client/`: Next.js frontend application
- `server/`: Express backend API
- `docker-compose.yml`: Docker Compose configuration
- `client/Dockerfile`: Docker configuration for the frontend
- `server/Dockerfile`: Docker configuration for the backend 