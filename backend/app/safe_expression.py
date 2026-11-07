"""Construct SymPy objects from a deliberately small Python AST; never eval strings."""
import ast
import math
import sympy as sp

SYMBOLS = {name: sp.Symbol(name, real=True) for name in ('x', 'y', 'z', 't', 'a', 'b', 'c')}
CONSTANTS = {'pi': sp.pi, 'e': sp.E}
FUNCTIONS = {name: getattr(sp, name) for name in ('sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'sqrt')}
FUNCTIONS['abs'] = sp.Abs


def parse_expression(source: str) -> sp.Expr:
    if not source.strip() or len(source) > 300:
        raise ValueError('Use a nonempty expression of at most 300 characters.')
    try:
        tree = ast.parse(source.replace('^', '**'), mode='eval')
    except SyntaxError as exc:
        raise ValueError('Invalid expression. Use explicit multiplication, for example 2*x.') from exc
    if sum(1 for _ in ast.walk(tree)) > 120:
        raise ValueError('Expression exceeds the 120-node limit.')

    def visit(node: ast.AST, depth: int = 0) -> sp.Expr:
        if depth > 25:
            raise ValueError('Expression is nested too deeply.')
        if isinstance(node, ast.Constant):
            if type(node.value) not in (int, float) or not math.isfinite(node.value) or abs(node.value) > 1e9:
                raise ValueError('Only finite numeric literals within ±1e9 are supported.')
            return sp.Rational(str(node.value))
        if isinstance(node, ast.Name):
            if node.id in SYMBOLS:
                return SYMBOLS[node.id]
            if node.id in CONSTANTS:
                return CONSTANTS[node.id]
            raise ValueError(f'Unknown symbol: {node.id}')
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = visit(node.operand, depth + 1)
            return value if isinstance(node.op, ast.UAdd) else sp.Mul(-1, value, evaluate=False)
        if isinstance(node, ast.BinOp):
            left, right = visit(node.left, depth + 1), visit(node.right, depth + 1)
            if isinstance(node.op, ast.Add):
                return sp.Add(left, right, evaluate=False)
            if isinstance(node.op, ast.Sub):
                return sp.Add(left, sp.Mul(-1, right, evaluate=False), evaluate=False)
            if isinstance(node.op, ast.Mult):
                return sp.Mul(left, right, evaluate=False)
            if isinstance(node.op, ast.Div):
                return sp.Mul(left, sp.Pow(right, -1, evaluate=False), evaluate=False)
            if isinstance(node.op, ast.Pow):
                # Nested exponent expressions are deliberately outside this service's grammar.
                if not isinstance(node.right, (ast.Name, ast.Constant, ast.UnaryOp)):
                    raise ValueError('Use a number or a single symbol as an exponent.')
                if right.is_number and abs(float(right)) > 100:
                    raise ValueError('Numerical exponents are limited to ±100.')
                return sp.Pow(left, right, evaluate=False)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS:
            if node.keywords or len(node.args) != 1:
                raise ValueError('Supported functions take one positional argument.')
            return FUNCTIONS[node.func.id](visit(node.args[0], depth + 1), evaluate=False)
        raise ValueError('Only arithmetic, approved functions and mathematical symbols are supported.')

    return visit(tree.body)
