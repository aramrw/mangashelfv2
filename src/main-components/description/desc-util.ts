export const splitTitleDots = (title: string | undefined): [string, string] => {
  if (!title) return ["", ""];

  const parts = title.split(".");
  const fileType = parts.length > 1 ? parts.pop()! : "No File Type";
  const name = parts.join(" ");
  return [name, fileType];
};

export const getTitlesFromPath = (path: string | undefined): [string, string] => {
  if (!path) return ["", ""];

  const parts = path.split(/[\\/]/);
  const panel = parts.pop();
  const parent = parts.pop();
  return [panel ?? "", parent ?? ""];
};

export const bytesToMB = (bytes: number): string => {
  if (bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)}mb`;
};
