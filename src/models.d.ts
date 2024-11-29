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
	metadata: FolderMetadata;
  is_manga_folder: boolean;
  is_double_panels: boolean;
  is_read: boolean;
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
  metadata: FileMetadata;
  is_read: bool;
  update_date: string;
  update_time: string;
}

export type FileMetadata = {
  created: number;
  modified: number;
  accessed: number;
  size: number;
}

export type FolderMetadata = {
  contains: FolderContains;
	size: number;
}

export type FolderContains = {
  files: number;
  folders: number;
}

