"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError, buildQuery } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";

interface UseServerTableOptions {
  endpoint: string;
  pageSize?: number;
  /** Static params always sent, e.g. scoping a list to the current patient. */
  staticParams?: Record<string, string | number | undefined>;
  /** Which query param a filter chip writes to (defaults to "status"). */
  filterParam?: string;
}

export function useServerTable<T>({
  endpoint,
  pageSize = 8,
  staticParams,
  filterParam = "status",
}: UseServerTableOptions) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const staticParamsKey = JSON.stringify(staticParams ?? {});

  // Debounce free-text search so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number | undefined> = {
      page,
      page_size: pageSize,
      search: search || undefined,
      ordering: ordering || undefined,
      ...(filterValue ? { [filterParam]: filterValue } : {}),
      ...(staticParams ?? {}),
    };
    api
      .get<Paginated<T>>(`${endpoint}${buildQuery(params)}`)
      .then((res) => {
        if (cancelled) return;
        setData(res.results);
        setCount(res.count);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load data.");
        setData([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          fetchedOnce.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, pageSize, search, ordering, filterValue, refreshKey, staticParamsKey]);

  const toggleSort = useCallback((key: string) => {
    setOrdering((current) => {
      if (current === key) return `-${key}`;
      if (current === `-${key}`) return null;
      return key;
    });
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return {
    data, count, loading, error, page, setPage, totalPages,
    searchInput, setSearchInput, ordering, toggleSort,
    filterValue, setFilterValue, refresh, hasLoadedOnce: fetchedOnce.current,
  };
}
