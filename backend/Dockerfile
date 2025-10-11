# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app


FROM base AS deps

COPY backend/requirements.txt .
RUN pip install --upgrade pip \
    && pip wheel --wheel-dir /wheels -r requirements.txt


FROM base AS test

ENV FLASK_ENV=test

COPY --from=deps /wheels /wheels
COPY backend/requirements.txt .
RUN pip install --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY backend/ .

CMD ["pytest", "-q"]


FROM base AS prod

ENV FLASK_ENV=production

COPY --from=deps /wheels /wheels
COPY backend/requirements.txt .
RUN pip install --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY backend/ .

EXPOSE 8000
ENV GUNICORN_CMD_ARGS="--bind 0.0.0.0:8000 --workers 2 --timeout 60"

CMD ["gunicorn", "app:create_app()"]
