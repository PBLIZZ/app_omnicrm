export function buildPagination(page: number, pageSize: number, total: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: totalPages > 0 && page < totalPages,
    hasPrev: totalPages > 0 && page > 1,
  };
}
