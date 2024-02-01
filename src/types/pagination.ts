export interface Pagination {
  offset: number;
  limit: number;
  filter?: {[field: string]: any};
  sort?: {field: string; order: 'ASC' | 'DESC'};
}
