export type Section = {
  id: string;
  project_id: string;
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
  note: string | null;
  stitch_count: number | null;
  done: boolean;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  activity: string[];
  created_at: string;
  cover_url: string | null;
  sections?: Section[];
};
