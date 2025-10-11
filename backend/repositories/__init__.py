"""Repository layer helpers for the Flask AI service."""

from .embedding_repo import (
    EmbeddingRepository,
    FaceEmbeddingCreate,
    FaceNeighbor,
    ImageNeighbor,
)

__all__ = [
    "EmbeddingRepository",
    "FaceEmbeddingCreate",
    "FaceNeighbor",
    "ImageNeighbor",
]
