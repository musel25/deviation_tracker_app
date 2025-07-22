import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

/**
 * DeviationSheet.jsx
 * -------------------
 * Renders the exact layout of the uploaded Excel file "(1) DRAWING_DEV"
 * using a plain HTML table so that:
 *
 *  •  Every row/column dimension matches the original workbook.
 *  •  Merged‑cells are faithfully reproduced with the proper rowSpan / colSpan.
 *  •  Users can edit any cell in‑place.
 *  •  Clicking “Download XLSX” will export the current table contents back
 *     to an .xlsx file that preserves the original merges, column widths, and
 *     row heights.
 *
 *  Required dependencies  (install with npm or yarn):
 *    npm i xlsx file-saver
 *
 *  Usage:
 *    <DeviationSheet workbookUrl="/Deviation format.xlsx" fileName="Deviation_filled.xlsx" />
 */

const pointToPx = (pt) => (pt == null ? 0 : pt * 1.333);         // Excel‑points → CSS‑px
const charToPx  = (wch) => (wch == null ? 64 : wch * 7.0);       // Excel colWidth → px

export default function DeviationSheet ({ workbookUrl, fileName = "Deviation_filled.xlsx" }) {
  const [grid, setGrid]   = useState([]);        // 2‑D array of cell objects  ({ v, mergeOrigin })
  const [rowMeta, setRow] = useState({});        // { idx: { hPx } }
  const [colMeta, setCol] = useState({});        // { idx: { wPx } }
  const [merges, setMrg]  = useState([]);        // XLSX !merges array

  /* ---------- 1.  Fetch & parse the workbook on first mount ---------- */
  useEffect(() => {
    (async () => {
      const ab = await fetch(workbookUrl).then(r => r.arrayBuffer());
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      /* rows as AoA (array‑of‑arrays) */
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: "" });

      /* Record column widths + row heights */
      const colW = {};
      const rowH = {};
      if (ws["!cols"]) ws["!cols"].forEach((c, i) => colW[i] = { wPx: charToPx(c.wch) });
      if (ws["!rows"]) ws["!rows"].forEach((r, i) => rowH[i] = { hPx: pointToPx(r.hpt) });

      /* Store merges so we can rebuild them later & to skip hidden cells now */
      const mArr = ws["!merges"] || [];

      /* Build a lookup (row,col) → {rowSpan,colSpan,hidden} */
      const mergedLookup = {};
      mArr.forEach(({ s, e }) => {
        const rs = e.r - s.r + 1;
        const cs = e.c - s.c + 1;
        for (let r = s.r; r <= e.r; ++r)
          for (let c = s.c; c <= e.c; ++c)
            mergedLookup[`${r},${c}`] = { rs, cs, origin: (r === s.r && c === s.c) };
      });

      /* Build grid of cell objects */
      const g = aoa.map((row, rIdx) =>
        row.map((value, cIdx) => {
          const key = `${rIdx},${cIdx}`;
          const mInfo = mergedLookup[key];
          const isOrigin = mInfo?.origin;
          return {
            v: value,
            mergeOrigin: isOrigin ? { rowSpan: mInfo.rs, colSpan: mInfo.cs } : null,
            hiddenByMerge: mInfo && !isOrigin
          };
        })
      );

      setGrid(g);
      setRow(rowH);
      setCol(colW);
      setMrg(mArr);
    })();
  }, [workbookUrl]);

  /* ---------- 2.  Handler to update grid on user edits ---------- */
  const onChange = (r, c, newVal) => {
    setGrid(prev => {
      const next = [...prev];
      next[r]    = [...next[r]];
      next[r][c] = { ...next[r][c], v: newVal };
      return next;
    });
  };

  /* ---------- 3.  Export current grid back to XLSX ---------- */
  const onDownload = () => {
    const aoa   = grid.map(row => row.map(cell => cell?.v ?? ""));
    const sheet = XLSX.utils.aoa_to_sheet(aoa);

    /* re‑apply merges, colWidths, rowHeights */
    sheet["!merges"] = merges;
    sheet["!cols"]   = Object.keys(colMeta).map(i => ({ wch: colMeta[i].wPx / 7 }));
    sheet["!rows"]   = Object.keys(rowMeta).map(i => ({ hpt: rowMeta[i].hPx / 1.333 }));

    const wb    = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Deviation");
    XLSX.writeFile(wb, fileName);
  };

  /* ---------- 4.  Render ---------- */
  return (
    <div className="overflow-auto border rounded">
      <table style={{ borderCollapse: "collapse" }}>
        <tbody>
          {grid.map((row, rIdx) => (
            <tr key={rIdx} style={{ height: (rowMeta[rIdx]?.hPx || 20) }}>
              {row.map((cell, cIdx) => {
                if (cell?.hiddenByMerge) return null;
                const meta = colMeta[cIdx];
                const style = {
                  width:  meta?.wPx || 64,
                  minWidth: meta?.wPx || 64,
                  border: "1px solid #222",
                  padding: 0
                };
                const props = cell?.mergeOrigin
                  ? { rowSpan: cell.mergeOrigin.rowSpan, colSpan: cell.mergeOrigin.colSpan }
                  : {};
                return (
                  <td key={cIdx} {...props} style={style}>
                    <input
                      value={cell?.v ?? ""}
                      onChange={e => onChange(rIdx, cIdx, e.target.value)}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        padding: "4px",
                        boxSizing: "border-box"
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onDownload} className="mt-4 px-4 py-2 border rounded">
        Download XLSX
      </button>
    </div>
  );
}
