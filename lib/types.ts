export type Stitch = {
  name: string;
  count: number;
};

export type Row = {
  id: string;
  pattern_id: string;
  position: number;
  title: string;
  stitches: Stitch[];
  note: string | null;
  done: boolean;
};

export type Pattern = {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  activity: string[];
  created_at: string;
  rows?: Row[];
};
