export type Stitch = {
  name: string;
  count: number;
};

export type Section = {
  id: string;
  pattern_id: string;
  position: number;
  name: string;
  yarn_name: string | null;
  yarn_weight: string | null;
  yarn_colour: string | null;
  hook_size: string | null;
  rows?: Row[];
};

export type Row = {
  id: string;
  section_id: string;
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
  sections?: Section[];
};
