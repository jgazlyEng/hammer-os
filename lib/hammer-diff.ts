export interface DiffLine {
  kind: "same" | "added" | "removed";
  text: string;
}

export function buildTextDiff(left: string, right: string) {
  const leftLines = normalizeLines(left);
  const rightLines = normalizeLines(right);
  const table = lcsTable(leftLines, rightLines);
  const lines: DiffLine[] = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      lines.unshift({ kind: "same", text: leftLines[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      lines.unshift({ kind: "added", text: rightLines[j - 1] });
      j -= 1;
    } else if (i > 0) {
      lines.unshift({ kind: "removed", text: leftLines[i - 1] });
      i -= 1;
    }
  }

  return {
    added: lines.filter((line) => line.kind === "added").length,
    removed: lines.filter((line) => line.kind === "removed").length,
    changed: lines.filter((line) => line.kind !== "same").length,
    lines
  };
}

function normalizeLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function lcsTable(left: string[], right: string[]) {
  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      table[i][j] = left[i - 1] === right[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table;
}
