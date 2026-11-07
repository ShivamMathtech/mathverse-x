"""Disposable bounded symbolic jobs. Spawn mode also works on Windows."""
import multiprocessing as mp
import time
from typing import Any
from .safe_expression import SYMBOLS, parse_expression
import sympy as sp


def perform(operation: str, expression: str, variable: str = 'x') -> dict[str, Any]:
    started = time.perf_counter()
    expr = parse_expression(expression)
    symbol = SYMBOLS[variable]
    if operation == 'differentiate':
        result = sp.diff(expr, symbol)
    elif operation == 'integrate':
        result = sp.integrate(expr, symbol)
    elif operation == 'simplify':
        result = sp.simplify(expr)
    elif operation == 'expand':
        result = sp.expand(expr)
    elif operation == 'factor':
        result = sp.factor(expr)
    elif operation == 'solve':
        result = sp.solveset(expr, symbol, domain=sp.S.Reals)
    else:
        raise ValueError('Unsupported symbolic operation.')
    plain, latex = str(result), sp.latex(result)
    if len(plain) + len(latex) > 50000:
        raise ValueError('Result exceeds the output-size limit.')
    unresolved = bool(result.has(sp.Integral, sp.Derivative, sp.ConditionSet))
    return {'result': plain, 'latex': latex, 'elapsed_ms': (time.perf_counter() - started) * 1000, 'fully_evaluated': not unresolved, 'warning': 'SymPy returned an unevaluated expression or conditional set.' if unresolved else None}


def _child(connection: Any, payload: dict[str, str]) -> None:
    try:
        try:
            import resource  # Linux only. The wall-clock deadline applies on every OS.
            resource.setrlimit(resource.RLIMIT_CPU, (7, 7))
            resource.setrlimit(resource.RLIMIT_AS, (768 * 1024**2, 768 * 1024**2))
        except ImportError:
            pass
        result = perform(**payload)
        connection.send({'ok': True, 'result': result})
    except Exception as exc:
        connection.send({'ok': False, 'error': str(exc)[:500] or type(exc).__name__})
    finally:
        connection.close()


def run_bounded(payload: dict[str, str], timeout: float = 8) -> dict[str, Any]:
    context = mp.get_context('spawn')
    receiver, sender = context.Pipe(duplex=False)
    process = context.Process(target=_child, args=(sender, payload), daemon=True)
    process.start()
    sender.close()
    try:
        if not receiver.poll(timeout):
            raise TimeoutError('Symbolic computation exceeded the time limit. Simplify the expression.')
        try:
            message = receiver.recv()
        except EOFError as exc:
            raise ValueError('Computation exceeded a resource limit or stopped unexpectedly.') from exc
        if not message['ok']:
            raise ValueError(message['error'])
        return message['result']
    finally:
        receiver.close()
        process.join(timeout=0.2)
        if process.is_alive():
            process.terminate()
            process.join(timeout=0.5)
        if process.is_alive():
            process.kill()
            process.join(timeout=0.5)
        process.close()
