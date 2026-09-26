export type StitchType = 'sc' | 'hdc' | 'dc' | 'tr' | 'dtr' | 'ch' | 'slst' | 'inc' | 'dec';

export type WorkedIn = 'rounds' | 'rows';

export type Yarn = {
  id: string;
  user_id: string;
  brand: string;
  colour_name: string;
  colour_hex: string;
  fiber: string | null;
  hook: string | null;
  skein: string | null;
  quantity: string | null;
  care: string | null;
  notes: string | null;
  image_path: string | null;
  created_at: string;
};

export type PatternStep = {
  id: string;
  pattern_id: string;
  position: number;
  name: string | null;
  note: string | null;
  yarn_id: string | null;
  stitch_unit: StitchType[];
  repeat_count: number;
  end_count: number | null;
  times: number;
};

export type Pattern = {
  id: string;
  user_id: string;
  name: string;
  hook_size: string | null;
  yarn_summary: string | null;
  worked_in: WorkedIn;
  image_path: string | null;
  current_step: number;
  current_stitch: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  pattern_steps?: PatternStep[];
};
