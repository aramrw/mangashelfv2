export type UserType = {
  id: string;
  username: string;
  settings: SettingsType;
}

export type SettingsType = {
  user_id: string;
  mpv_path?: string;
  plugins_path?: string;
  autoplay: boolean;
  update_date: string;
  update_time: string;
}

export type UserFormType = {
  username: string;
}

export type OsFolder = {
  user_id: string;
  path: string;
  title: string;
  parent_path: string | undefined;
  last_read_panel: MangaPanel | undefined;
  cover_img_path: string | undefined;
  is_manga_folder: boolean;
  is_double_panels: boolean;
  zoom: number;
	is_hidden: boolean;
  update_date: string;
  update_time: string;
}

export type MangaPanel = {
  user_id: string;
  path: string;
  title: string;
  parent_path: string;
  is_read: bool;
  update_date: string;
  update_time: string;
}

