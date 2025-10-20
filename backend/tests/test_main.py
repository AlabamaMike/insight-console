import pytest
from fastapi.testclient import TestClient
from insight_console.main import app

client = TestClient(app)

def test_health_check():
    """Test health check endpoint returns healthy status"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "insight-console"
    }
