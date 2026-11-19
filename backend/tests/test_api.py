import os
os.environ["DATABASE_URL"] = "sqlite:///./test_ajaia.db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def login(email):
    response = client.post("/api/auth/demo-login", json={"email": email})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def test_document_persists_and_viewer_cannot_edit():
    alex = login("alex@ajaia.demo")
    sam = login("sam@ajaia.demo")
    created = client.post("/api/documents", headers=alex, json={
        "title": "Acceptance test",
        "content": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]}
    })
    assert created.status_code == 201
    doc_id = created.json()["id"]

    shared = client.post(f"/api/documents/{doc_id}/share", headers=alex, json={
        "email": "sam@ajaia.demo", "permission": "viewer"
    })
    assert shared.status_code == 200

    read = client.get(f"/api/documents/{doc_id}", headers=sam)
    assert read.status_code == 200
    assert read.json()["content"]["content"][0]["content"][0]["text"] == "Hello"

    denied = client.patch(f"/api/documents/{doc_id}", headers=sam, json={"title": "Should fail"})
    assert denied.status_code == 403

    updated = client.patch(f"/api/documents/{doc_id}", headers=alex, json={"title": "Persisted title"})
    assert updated.status_code == 200
    reopened = client.get(f"/api/documents/{doc_id}", headers=alex)
    assert reopened.json()["title"] == "Persisted title"
