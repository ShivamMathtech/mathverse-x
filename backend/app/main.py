import hmac
import os
import threading
from typing import Literal
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from .computation import run_bounded


class SymbolicRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    operation: Literal['differentiate', 'integrate', 'simplify', 'expand', 'factor', 'solve']
    expression: str = Field(min_length=1, max_length=300)
    variable: Literal['x', 'y', 'z', 't', 'a', 'b', 'c'] = 'x'


def create_app() -> FastAPI:
    app = FastAPI(title='MATHVERSE X computational service', version='0.1.0')
    token = os.environ.get('MATHVERSE_API_TOKEN', '')
    origins = [s.strip() for s in os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if s.strip() and s.strip() != '*']
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'], allow_credentials=False)
    slots = threading.BoundedSemaphore(2)

    @app.middleware('http')
    async def request_limit(request: Request, call_next):
        # Bound the actual stream, including bodies without Content-Length.
        size = 0
        chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 8192:
                return JSONResponse({'detail': 'Request body exceeds 8 KB.'}, status_code=413)
            chunks.append(chunk)
        request._body = b''.join(chunks)
        return await call_next(request)

    def authenticate(authorization: str | None = Header(default=None)):
        if len(token) < 32:
            raise HTTPException(503, 'Configure MATHVERSE_API_TOKEN with at least 32 characters before using the API.')
        supplied = authorization[7:] if authorization and authorization.startswith('Bearer ') else ''
        if not hmac.compare_digest(supplied.encode(), token.encode()):
            raise HTTPException(401, 'Invalid API token.', headers={'WWW-Authenticate': 'Bearer'})

    @app.get('/health')
    def health():
        return {'service': 'mathverse-x', 'status': 'ok', 'version': '0.1.0'}

    @app.get('/api/capabilities', dependencies=[Depends(authenticate)])
    def capabilities():
        return {'service': 'mathverse-x', 'operations': ['differentiate', 'integrate', 'simplify', 'expand', 'factor', 'solve'], 'max_expression_length': 300, 'timeout_seconds': 8}

    @app.post('/api/symbolic', dependencies=[Depends(authenticate)])
    def symbolic(request: SymbolicRequest):
        if not slots.acquire(blocking=False):
            raise HTTPException(429, 'Both computation slots are busy. Try again shortly.')
        try:
            return run_bounded(request.model_dump())
        except TimeoutError as exc:
            raise HTTPException(408, str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        finally:
            slots.release()

    return app


app = create_app()
