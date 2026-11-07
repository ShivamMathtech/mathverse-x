import type { Project, SampledCurve } from "../mathematics/types";
export function download(
  content: BlobPart,
  filename: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function slug(name: string) {
  return (
    name
      .replace(/[^a-z0-9_-]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 70) || "mathverse-project"
  );
}
export function exportCSV(samples: SampledCurve[], project: Project) {
  const rows = ["curve_id,kind,segment,x,y"];
  samples.forEach((s) =>
    s.segments.forEach((segment, i) =>
      segment.forEach(([x, y]) =>
        rows.push(
          [
            s.id,
            project.curves.find((c) => c.id === s.id)?.kind ?? "overlay",
            i,
            x,
            y,
          ]
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(","),
        ),
      ),
    ),
  );
  download(
    rows.join("\r\n"),
    `${slug(project.name)}.csv`,
    "text/csv;charset=utf-8",
  );
}
export async function exportGraph(
  svg: SVGSVGElement,
  project: Project,
  format: "svg" | "png",
  light: boolean,
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const width = svg.clientWidth || 1000,
    height = svg.clientHeight || 600;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.querySelectorAll("[data-inspection]").forEach((el) => el.remove());
  const desc = document.createElementNS("http://www.w3.org/2000/svg", "desc");
  desc.textContent = JSON.stringify({
    name: project.name,
    viewport: project.viewport,
    parameters: project.parameters,
    curves: project.curves,
  });
  clone.prepend(desc);
  const source = new XMLSerializer().serializeToString(clone);
  if (format === "svg") {
    download(source, `${slug(project.name)}.svg`, "image/svg+xml");
    return;
  }
  const url = URL.createObjectURL(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("PNG export is not available in this browser.");
    context.fillStyle = light ? "#f7f9fa" : "#0f1419";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    );
    download(blob, `${slug(project.name)}.png`, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
