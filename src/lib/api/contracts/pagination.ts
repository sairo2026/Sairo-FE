import { z } from "zod";
import type { ZodType } from "zod";

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 25;

export type PageQuery = {
  /** 0부터 시작한다. */
  page?: number;
  size?: PageSize;
  /** 쉼표로 여러 값을 보낼 수 있다. */
  status?: readonly string[];
};

export type PageResponse<Item> = {
  items: Item[];
  page: number;
  size: number;
  totalElements: number;
};

export function pageResponseSchema<Item>(itemSchema: ZodType<Item>): ZodType<PageResponse<Item>> {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(0),
    size: z.number().int().positive(),
    totalElements: z.number().int().min(0),
  });
}

export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

export function buildPageSearchParams(query: PageQuery = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? DEFAULT_PAGE_SIZE));
  if (query.status && query.status.length > 0) params.set("status", query.status.join(","));
  return params;
}

export function totalPages(
  response: Pick<PageResponse<unknown>, "size" | "totalElements">,
): number {
  if (response.size <= 0) return 0;
  return Math.ceil(response.totalElements / response.size);
}
