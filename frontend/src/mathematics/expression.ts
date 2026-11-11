import { parse, derivative } from "mathjs";
const functions = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "sqrt",
  "cbrt",
  "abs",
  "exp",
  "log",
  "log10",
  "floor",
  "ceil",
  "round",
  "sign",
  "min",
  "max",
]);
const variables = new Set(["x", "t", "u", "theta", "time", "a", "b", "c", "pi", "e"]);
const operators = new Set([
  "+",
  "-",
  "*",
  "/",
  "^",
  "%",
  "<",
  ">",
  "<=",
  ">=",
  "==",
  "!=",
  "and",
  "or",
  "not",
]);
export function validatedNode(expression: string) {
  if (!expression.trim()) throw new Error("Enter a mathematical expression.");
  if (expression.length > 300)
    throw new Error("Use at most 300 characters per expression.");
  const node = parse(expression);
  let count = 0;
  node.traverse((n) => {
    if (++count > 120)
      throw new Error("Expression is too complex (120-node limit).");
    if (n.type === "ConstantNode") {
      if (typeof (n as unknown as { value: unknown }).value !== "number")
        throw new Error("Only numerical constants are supported.");
    } else if (n.type === "SymbolNode") {
      const name = (n as unknown as { name: string }).name;
      if (!variables.has(name) && !functions.has(name))
        throw new Error(`Unknown symbol: ${name}. Use x, t, time, u, theta, a, b or c.`);
    } else if (n.type === "FunctionNode") {
      if (!functions.has((n as unknown as { name: string }).name))
        throw new Error("This function is not supported.");
      if ((n as unknown as { args: unknown[] }).args.length > 4)
        throw new Error("At most four function arguments are supported.");
    } else if (n.type === "OperatorNode") {
      if (!operators.has((n as unknown as { op: string }).op))
        throw new Error("This operator is not supported.");
    } else if (!["ParenthesisNode", "ConditionalNode"].includes(n.type)) {
      throw new Error(
        "Use scalar math only; assignments, arrays and property access are not allowed.",
      );
    }
  });
  return node;
}
const compilationCache = new Map<string, {
  compiled: ReturnType<ReturnType<typeof validatedNode>["compile"]>;
  latex: string;
}>();
export function compileScalar(
  expression: string,
  parameters: Record<string, number> = {},
  independent = "x",
  time = 0,
) {
  const key = independent + "\u0000" + expression;
  let cached = compilationCache.get(key);
  if (!cached) {
    const node = validatedNode(expression);
    node.traverse((n) => {
    if (n.type === "SymbolNode") {
      const name = (n as unknown as { name: string }).name;
      if (
        ["x", "t", "u", "theta"].includes(name) &&
        name !== independent &&
        !(independent === "x" && name === "t") &&
        !(independent === "t" && name === "u") &&
        !(independent === "theta" && name === "t")
      )
        throw new Error(
          `Use ${independent} as the independent variable for this curve.`,
        );
    }
    });
    cached = { compiled: node.compile(), latex: node.toTex() };
    if (compilationCache.size >= 80) compilationCache.delete(compilationCache.keys().next().value!);
    compilationCache.set(key, cached);
  }
  const { compiled, latex } = cached;
  const scope = new Map<string, number>(Object.entries(parameters));
  scope.set("time", time);
  if (independent === "x") scope.set("t", time);
  return {
    latex,
    evaluate(value: number) {
      scope.set(independent, value);
      if (independent === "theta") scope.set("t", value);
      if (independent === "t") scope.set("u", value);
      try {
        const result: unknown = compiled.evaluate(scope);
        return typeof result === "number" && Number.isFinite(result)
          ? result
          : NaN;
      } catch {
        return NaN;
      }
    },
  };
}
export function differentiate(expression: string) {
  const result = derivative(validatedNode(expression), "x");
  return result.toString();
}
