"""
HTTP benchmarks against a running API (Docker Compose with Postgres).
Set BENCHMARK_BASE_URL (default http://localhost:8000).
"""
import os
import uuid
import pytest
import httpx


BASE_URL = os.getenv("BENCHMARK_BASE_URL", "http://localhost:8000")


@pytest.fixture(scope="session")
def bench_client():
    if not BASE_URL:
        pytest.skip("BENCHMARK_BASE_URL not set")
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    try:
        response = client.get("/health")
        response.raise_for_status()
    except Exception:
        client.close()
        pytest.skip("API not reachable for benchmarks")
    yield client
    client.close()


@pytest.fixture(scope="session")
def member_token(bench_client):
    username = f"bench_{uuid.uuid4().hex}"
    password = "bench_password_123"
    register_payload = {
        "email": f"{username}@example.com",
        "username": username,
        "full_name": "Benchmark User",
        "password": password,
        "role": "member",
    }
    bench_client.post("/api/auth/register", json=register_payload)

    login_payload = {"username": username, "password": password}
    response = bench_client.post("/api/auth/login", data=login_payload)
    response.raise_for_status()
    token = response.json()["access_token"]
    return token


def test_benchmark_health(benchmark, bench_client):
    def _call():
        response = bench_client.get("/health")
        response.raise_for_status()
        return response

    benchmark(_call)


def test_benchmark_books_list(benchmark, bench_client, member_token):
    headers = {"Authorization": f"Bearer {member_token}"}

    def _call():
        response = bench_client.get("/api/books", headers=headers)
        response.raise_for_status()
        return response

    benchmark(_call)
