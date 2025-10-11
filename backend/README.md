# Backend Service

## Run with Docker

```bash
docker build -t ng-backend ./backend
docker run --rm -p 8000:8000 ng-backend
```

The application exposes a FastAPI health check at `http://localhost:8000/health`.

## Run with Docker Compose

```bash
docker compose up --build backend
```

This uses the root-level `docker-compose.yml` to build the same image and publish `http://localhost:8000/health`.

Dependencies for the container are pinned in `backend/requirements.txt` to match the FastAPI service.
