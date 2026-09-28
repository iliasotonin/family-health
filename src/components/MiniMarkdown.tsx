import React from "react";

// Minimal markdown: paragraphs, **bold**, "- " bullet lists and pipe tables. No deps.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{p}</React.Fragment>;
  });
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
const cells = (l: string) =>
  l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export default function MiniMarkdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      const items = [...list];
      blocks.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 my-2">
          {items.map((li, i) => (
            <li key={i}>{renderInline(li, `li-${key}-${i}`)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // Table: header row + separator + body rows.
    if (isTableRow(line) && isTableRow(lines[i + 1] ?? "") && isSeparator(lines[i + 1])) {
      flushList();
      const header = cells(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(cells(lines[j]));
        j++;
      }
      blocks.push(
        <div key={`tbl-${key++}`} className="my-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="text-left font-semibold text-muted border-b py-1.5 pr-3 whitespace-nowrap"
                  >
                    {renderInline(h, `th-${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b py-1.5 pr-3 align-top">
                      {renderInline(c, `td-${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j - 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      list.push(line.replace(/^\s*-\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="my-1.5 leading-relaxed">
          {renderInline(line, `p-${key}`)}
        </p>
      );
    }
  }
  flushList();

  return <div className="text-sm">{blocks}</div>;
}
