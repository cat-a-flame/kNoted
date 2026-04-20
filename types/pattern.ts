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
  position: number;
};

export type Pattern = {
  id: string;
  name: string;
  archived: boolean;
  activity: string[];
  createdAt: string;
  rows: PatternRow[];
};
