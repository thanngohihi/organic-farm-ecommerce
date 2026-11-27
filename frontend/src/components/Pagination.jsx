import React from 'react';

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pageSet = new Set([1, totalPages, currentPage]);
  if (currentPage - 1 >= 1) pageSet.add(currentPage - 1);
  if (currentPage + 1 <= totalPages) pageSet.add(currentPage + 1);
  if (currentPage <= 2) pageSet.add(3);
  if (currentPage >= totalPages - 1) pageSet.add(totalPages - 2);

  const sorted = Array.from(pageSet)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    if (i > 0 && page - sorted[i - 1] > 1) {
      items.push('...');
    }
    items.push(page);
  }

  return items;
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const items = getPageItems(currentPage, totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trước
      </button>

      {items.map((item, idx) =>
        item === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1.5 text-xs font-bold text-slate-400 select-none"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`h-8 min-w-[32px] rounded-lg px-2.5 text-xs font-bold transition ${
              currentPage === item
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
}
