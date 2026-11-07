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
const variables = new Set(["x", "t", "theta", "a", "b", "c", "pi", "e"]);
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
        throw new Error(`Unknown symbol: ${name}. Use x, t, theta, a, b or c.`);
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
export function compileScalar(
  expression: string,
  parameters: Record<string, number> = {},
  independent = "x",
) {
  const node = validatedNode(expression);
  node.traverse((n) => {
    if (n.type === "SymbolNode") {
      const name = (n as unknown as { name: string }).name;
      if (
        ["x", "t", "theta"].includes(name) &&
        name !== independent &&
        !(independent === "theta" && name === "t")
      )
        throw new Error(
          `Use ${independent} as the independent variable for this curve.`,
        );
    }
  });
  const compiled = node.compile();
  const scope = new Map<string, number>(Object.entries(parameters));
  return {
    latex: node.toTex(),
    evaluate(value: number) {
      scope.set(independent, value);
      if (independent === "theta") scope.set("t", value);
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
