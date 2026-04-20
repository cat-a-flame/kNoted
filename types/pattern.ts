export type Stitch = {
  id: string;
  name: string;
  count: number;
};

export type PatternRow = {
  id: string;
  title: string;
  note?: string;
  stitches: Stitch[];
  done: boolean;
};

export type Pattern = {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
  rows: PatternRow[];
};
