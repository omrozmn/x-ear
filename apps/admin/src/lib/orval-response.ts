export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function unwrapData<T>(value: unknown): T | undefined {
  if (!value) {
    return undefined;
  }

  if (isRecord(value) && 'data' in value) {
    return value.data as T | undefined;
  }

  return value as T;
}

export function unwrapArray<T>(value: unknown): T[] {
  const unwrapped = unwrapData<T[]>(value);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export interface PaginationLike {
  total?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
  perPage?: number;
}

function hasPaginationValues(value: PaginationLike | null): value is PaginationLike {
  return value !== null && Object.values(value).some((entry) => entry !== undefined);
}

function toPaginationLike(value: unknown): PaginationLike | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    total: typeof value.total === 'number' ? value.total : undefined,
    totalPages: typeof value.totalPages === 'number' ? value.totalPages : undefined,
    page: typeof value.page === 'number' ? value.page : undefined,
    limit: typeof value.limit === 'number' ? value.limit : undefined,
    perPage: typeof value.perPage === 'number' ? value.perPage : undefined,
  };
}

export function extractPagination(value: unknown): PaginationLike | null {
  const direct = toPaginationLike(value);
  if (hasPaginationValues(direct)) {
    return direct;
  }

  const unwrapped = unwrapData<unknown>(value);
  if (isRecord(unwrapped)) {
    const nestedPagination = toPaginationLike(unwrapped.pagination);
    if (hasPaginationValues(nestedPagination)) {
      return nestedPagination;
    }

    const nestedMeta = toPaginationLike(unwrapped.meta);
    if (hasPaginationValues(nestedMeta)) {
      return nestedMeta;
    }
  }

  if (isRecord(value)) {
    const rootPagination = toPaginationLike(value.pagination);
    if (hasPaginationValues(rootPagination)) {
      return rootPagination;
    }

    const rootMeta = toPaginationLike(value.meta);
    if (hasPaginationValues(rootMeta)) {
      return rootMeta;
    }
  }

  return null;
}
