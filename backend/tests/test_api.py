import pytest
import sympy as sp
from fastapi.testclient import TestClient
from app.main import create_app
from app.safe_expression import parse_expression, SYMBOLS
from app.computation import perform, run_bounded

TOKEN = 'test-token-with-at-least-thirty-two-characters'

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('MATHVERSE_API_TOKEN', TOKEN)
    return TestClient(create_app())


def headers():
    return {'Authorization': f'Bearer {TOKEN}'}


def test_health_and_auth(client):
    assert client.get('/health').json()['service'] == 'mathverse-x'
    assert client.get('/api/capabilities').status_code == 401
    assert client.get('/api/capabilities', headers=headers()).status_code == 200
    assert client.get('/api/capabilities', headers={'Authorization': 'Bearer wrong'}).status_code == 401


def test_unconfigured_service_fails_closed(monkeypatch):
    monkeypatch.delenv('MATHVERSE_API_TOKEN', raising=False)
    assert TestClient(create_app()).get('/api/capabilities', headers=headers()).status_code == 503


def test_differentiate_end_to_end(client):
    response = client.post('/api/symbolic', headers=headers(), json={'operation': 'differentiate', 'expression': 'x^2'})
    assert response.status_code == 200, response.text
    assert response.json()['result'] == '2*x'
    assert response.json()['fully_evaluated'] is True


def test_cors_is_explicit(client):
    response = client.options('/api/symbolic', headers={'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'})
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'
    response = client.options('/api/symbolic', headers={'Origin': 'https://untrusted.invalid', 'Access-Control-Request-Method': 'POST'})
    assert 'access-control-allow-origin' not in response.headers


def test_request_validation_and_size(client):
    assert client.post('/api/symbolic', headers=headers(), json={'operation': 'execute', 'expression': '1'}).status_code == 422
    assert client.post('/api/symbolic', headers=headers(), json={'operation': 'integrate', 'expression': 'x' * 301}).status_code == 422
    assert client.post('/api/symbolic', headers=headers(), content=b'x'*9000).status_code == 413


@pytest.mark.parametrize('source', ['__import__("os")', 'x.__class__', '[x for x in [1]]', 'lambda: 1', 'eval("2")', 'x[0]', 'True', 'x=1', '2**(2**40)', 'x**1001', 'sin(x, y)'])
def test_parser_rejects_code(source):
    with pytest.raises(ValueError):
        parse_expression(source)


def test_parser_preserves_mathematics():
    x = SYMBOLS['x']
    assert sp.simplify(parse_expression('sin(x)^2 + cos(x)^2')) == 1
    assert sp.diff(parse_expression('x^3 + 2*x'), x) == 3*x**2 + 2


@pytest.mark.parametrize('operation, expression, expected', [
    ('integrate', 'x^2', 'x**3/3'),
    ('factor', 'x^2 - 1', '(x - 1)*(x + 1)'),
    ('expand', '(x + 1)^2', 'x**2 + 2*x + 1'),
    ('simplify', 'sin(x)^2 + cos(x)^2', '1'),
    ('solve', 'x^2 - 4', '{-2, 2}'),
])
def test_symbolic_reference_cases(operation, expression, expected):
    assert perform(operation, expression)['result'] == expected


def test_worker_timeout_cleans_up():
    with pytest.raises(TimeoutError):
        run_bounded({'operation': 'integrate', 'expression': 'x^2', 'variable': 'x'}, timeout=0.000001)
    assert run_bounded({'operation': 'differentiate', 'expression': 'x^2', 'variable': 'x'})['result'] == '2*x'
