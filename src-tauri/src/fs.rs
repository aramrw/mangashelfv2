use hashbrown::{HashMap, HashSet};
use rayon::slice::ParallelSliceMut;
use serde::{Deserialize, Serialize};
use std::iter::Iterator;
//use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
//use std::time::Instant;
use futures_util::TryStreamExt;
use rayon::iter::IntoParallelRefIterator;
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use std::{env, io};
use std::{fs::read_dir, process::Command};
use tokio::io::AsyncWriteExt;

use crate::database::data::v1::MangaPanel;
use crate::database::{data::v1::OsFolder, update_os_folders};
use crate::database::{delete_os_folders, update_panels};
use crate::database::{delete_panels, EPISODE_TITLE_REGEX};
use crate::misc::get_date_time;
use reqwest::Client;
use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

use crate::error::{DatabaseError, HttpClientError, MangaShelfError, ReadDirError};

use phf::phf_set;

pub static SUPPORTED_IMAGE_FORMATS: phf::Set<&'static str> = phf_set! {
    "jpg", "jpeg", "png", "gif", "bmp", "tiff",  "webp", "svg",  "heif",
    "raw", "ico", "apng", "jfif", "exi",
};

trait Pushable {
    fn push(&mut self, value: String);
}

impl Pushable for Vec<String> {
    fn push(&mut self, value: String) {
        self.push(value);
    }
}

impl Pushable for HashSet<String> {
    fn push(&mut self, value: String) {
        self.insert(value);
    }
}

fn read_dir_helper(
    path: &str,
    child_folder_paths: &mut impl Pushable,
    panel_paths: &mut impl Pushable,
) -> Result<(), io::Error> {
    for entry in read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();

        if let Some(extension) = entry_path.extension() {
            let extension_lossy = extension.to_string_lossy();
            if SUPPORTED_IMAGE_FORMATS.get_key(&extension_lossy).is_some() {
                panel_paths.push(entry_path.to_string_lossy().to_string());
            }
        } else if entry_path.is_dir() {
            child_folder_paths.push(entry_path.to_string_lossy().to_string());
            continue;
        }
    }

    Ok(())
}

fn delete_stale_entries(
    handle: AppHandle,
    old_dirs: Option<&[OsFolder]>,
    old_panels: Option<&[MangaPanel]>,
) -> Result<bool, DatabaseError> {
    let mut refetch = false;
    let mut del_folders = Vec::new();
    let mut del_panels = Vec::new();

    if let Some(old_dirs) = old_dirs {
        for f in old_dirs {
            if !Path::new(&f.path).exists() {
                del_folders.push(f.clone())
            }
        }
    }

    if let Some(old_panels) = old_panels {
        for p in old_panels {
            if !Path::new(&p.path).exists() {
                del_panels.push(p.clone());
            }
        }
    }

    if !del_folders.is_empty() {
        refetch = true;
        delete_os_folders(handle.clone(), del_folders)?;
    }
    if !del_panels.is_empty() {
        refetch = true;
        delete_panels(&handle, del_panels)?;
    }

    Ok(refetch)
}

type FolderGroup = (OsFolder, Vec<OsFolder>, Vec<MangaPanel>);
pub trait HasPath {
    fn path(&self) -> &str;
}

fn find_missing_paths<'a, O, I>(old: &[O], new: I) -> Option<HashSet<String>>
where
    O: HasPath,
    I: Iterator<Item = &'a String>,
{
    // Normalize old paths and collect them into a set.
    let old_paths: HashSet<String> = old.iter().map(|x| normalize_path(x.path())).collect();

    // Normalize new paths and collect them into a set.
    let new_paths: HashSet<String> = new.map(|p| normalize_path(p)).collect();

    // Find paths missing in the new set (deletions) and paths missing in the old set (additions).
    let missing: HashSet<String> = old_paths
        .difference(&new_paths) // Paths in old but not in new (deletions).
        .chain(new_paths.difference(&old_paths)) // Paths in new but not in old (additions).
        .cloned()
        .collect();

    // Return `None` if there are no missing paths, otherwise return the set.
    if missing.is_empty() {
        None
    } else {
        Some(missing)
    }
}

fn normalize_path(path: &str) -> String {
    path.to_lowercase().replace('\\', "/") // Normalize case and separators.
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum StaleEntries {
    Found {
        dirs: Option<HashSet<String>>,
        panels: Option<HashSet<String>>,
    },
    None,
}

impl StaleEntries {
    pub fn is_none(&self) -> bool {
        matches!(self, StaleEntries::None)
    }
}

fn find_stale_entries(
    main_dir: &str,
    old_dirs: Option<&[OsFolder]>,
    old_panels: Option<&[MangaPanel]>,
) -> Result<StaleEntries, ReadDirError> {
    // Collect new directories and panels from the filesystem.
    let mut new_dirs = HashSet::new();
    let mut new_panels = HashSet::new();
    read_dir_helper(main_dir, &mut new_dirs, &mut new_panels)?;

    // Default to empty slices if `old_dirs` or `old_panels` are `None`.
    let old_dirs = old_dirs.unwrap_or_default();
    let old_panels = old_panels.unwrap_or_default();

    // Compare old and new entries to determine which are stale.
    let dirs = find_missing_paths(old_dirs, new_dirs.iter());
    let panels = find_missing_paths(old_panels, new_panels.iter());

    // If no new entries are found, return `None`. Otherwise, return the found entries.
    match (&dirs, &panels) {
        (None, None) => Ok(StaleEntries::None),
        _ => Ok(StaleEntries::Found { dirs, panels }),
    }
}

#[command]
pub fn upsert_read_os_dir(
    handle: AppHandle,
    dir: String,
    parent_path: Option<String>,
    user_id: String,
    old_dirs: Option<Vec<OsFolder>>,
    old_panels: Option<Vec<MangaPanel>>,
) -> Result<bool, MangaShelfError> {
    // Find stale entries based on the provided directory and old data.
    let stale_entries = find_stale_entries(&dir, old_dirs.as_deref(), old_panels.as_deref())?;
    println!("stale_entries: {:#?}", stale_entries);

    // If there are no stale entries and either `old_dirs` or `old_panels` is provided,
    // return `false` to prevent unnecessary re-rendering.
    if (old_dirs.is_some() || old_panels.is_some()) && stale_entries.is_none() {
        println!("fully hydrated, re-reading dir is not necessary.");
        return Ok(false);
    }

    // Delete stale entries and track whether a refetch is needed.
    delete_stale_entries(handle.clone(), old_dirs.as_deref(), old_panels.as_deref())?;

    // Read the OS folder directory and retrieve updated data.
    let (main_folder, mut new_cfs, panels) =
        read_os_folder_dir(dir, user_id, None, parent_path, &stale_entries)?;

    // Update panels and folders with the new data.
    update_panels(&handle, panels, None)?;
    new_cfs.push(main_folder);
    update_os_folders(handle, new_cfs)?;

    // Indicate whether a refetch was performed.
    Ok(true)
}

pub fn read_os_folder_dir(
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
    stale_entries: &StaleEntries,
) -> Result<FolderGroup, ReadDirError> {
    let mut childfolder_paths: Vec<String> = Vec::new();
    let mut panel_paths: Vec<String> = Vec::new();
    read_dir_helper(&path, &mut childfolder_paths, &mut panel_paths)?;

    if childfolder_paths.is_empty() && panel_paths.is_empty() {
        return Err(ReadDirError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    }

    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    let (update_date, update_time) = update_datetime.clone().unwrap_or_else(get_date_time);

    let mut total_child_folders: Vec<OsFolder> = Vec::new();
    let mut total_panels: Vec<MangaPanel> = Vec::new();
    let current_folders_panels: Vec<MangaPanel> = panel_paths
        .into_iter()
        .filter_map(|panel_path| {
            MangaPanel::new(
                user_id.clone(),
                path.clone(),
                panel_path,
                update_date.clone(),
                update_time.clone(),
            )
            .ok()
        })
        .collect::<Vec<MangaPanel>>();
    let is_manga_folder = !current_folders_panels.is_empty();
    total_panels.extend(current_folders_panels);

    total_panels.par_sort_by(|a, b| {
        // Extract the episode number from the title using regex
        let num_a = EPISODE_TITLE_REGEX
            .captures(&a.title)
            .and_then(|caps| caps.get(1)) // Assuming the first capturing group contains the episode number
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        let num_b = EPISODE_TITLE_REGEX
            .captures(&b.title)
            .and_then(|caps| caps.get(1))
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(0);

        num_a.cmp(&num_b)
    });

    let first_panel = total_panels.first().cloned();
    let mut cover_img = first_panel.as_ref().map(|p| p.path.clone());

    let child_folders_group: Vec<FolderGroup> = childfolder_paths
        .into_par_iter()
        .filter_map(|folder_path| {
            read_os_folder_dir(
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
                stale_entries,
            )
            .ok()
        })
        .collect();

    for group in child_folders_group.into_iter() {
        let (folder, c_folders, g_panels) = group;
        total_panels.extend(g_panels);

        if cover_img.is_none() {
            if let Some(cover_img_path) = &folder.cover_img_path {
                cover_img = Some(cover_img_path.to_owned());
            }
        }

        total_child_folders.push(folder);
        total_child_folders.extend(c_folders);
    }

    let main_folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        parent_path,
        last_read_panel: first_panel,
        cover_img_path: cover_img,
        is_manga_folder,
        is_double_panels: false,
        zoom: 100,
        is_hidden: false,
        update_date,
        update_time,
    };

    Ok((main_folder, total_child_folders, total_panels))
}

#[command]
pub fn check_cover_img_exists(img_path: &str) -> bool {
    let path = Path::new(img_path);
    if path.exists() {
        return true;
    }
    false
}

fn _call_ffmpeg_sidecar(
    handle: &AppHandle,
    entry_path: impl AsRef<str>,
    entry_frame_full_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar_cmd = handle.shell().sidecar("ffmpeg").unwrap().args([
        "-ss",
        "5",
        "-i",
        entry_path.as_ref(),
        "-frames:v",
        "1",
        &entry_frame_full_path.to_string_lossy(),
    ]);

    let (mut _rx, mut _child) = sidecar_cmd.spawn().unwrap();
    //println!("running ffmpegsidecar function");

    Ok(())
}

pub fn _normalize_path(path: &str) -> PathBuf {
    let normalized = path
        .replace("/", std::path::MAIN_SEPARATOR_STR)
        .replace("\\", std::path::MAIN_SEPARATOR_STR);
    Path::new(&normalized).to_path_buf()
}

#[command]
pub async fn download_mpv_binary(handle: AppHandle) -> Result<String, HttpClientError> {
    let platform = env::consts::OS;
    let url = match platform {
        "macos" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-aarch64-apple-darwin",
        "windows" => "https://github.com/aramrw/mpv_shelf_v2/releases/download/v0.0.1/mpv-x86_64-pc-windows-msvc.exe",
        _ => return Ok("unsupported platform".to_string()),
    };

    let client = Client::new();
    let response = client.get(url).send().await?; // Handle errors
    let total_size = response.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let app_data_dir = handle.path().app_data_dir()?;
    let mpv_file_name = match platform {
        "macos" => "mpv",
        "windows" => "mpv.exe",
        _ => "mpv",
    };
    let mpv_file_path = app_data_dir.join(mpv_file_name);

    let mut file = tokio::fs::File::create(&mpv_file_path).await?;

    while let Some(chunk) = stream.try_next().await? {
        downloaded += chunk.len() as u64;

        file.write_all(&chunk).await?;

        let percentage = (downloaded as f64 / total_size as f64) * 100.0;
        handle.emit("progress", percentage as u64)?;
    }

    Ok(mpv_file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::exists(&PathBuf::from(path))
}

#[tauri::command]
pub fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        let mut child = Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .unwrap();

        child
            .wait()
            .expect("failed to wait for windows file explorer to end");
    }

    // #[cfg(target_os = "linux")]
    // {
    //     if path.contains(",") {
    //         // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
    //         let new_path = match metadata(&path).unwrap().is_dir() {
    //             true => path,
    //             false => {
    //                 let mut path2 = PathBuf::from(path);
    //                 path2.pop();
    //                 path2.into_os_string().into_string().unwrap()
    //             }
    //         };
    //         Command::new("xdg-open").arg(&new_path).spawn().unwrap();
    //     } else {
    //         if let Ok(Fork::Child) = daemon(false, false) {
    //             Command::new("dbus-send")
    //                 .args([
    //                     "--session",
    //                     "--dest=org.freedesktop.FileManager1",
    //                     "--type=method_call",
    //                     "/org/freedesktop/FileManager1",
    //                     "org.freedesktop.FileManager1.ShowItems",
    //                     format!("array:string:\"file://{path}\"").as_str(),
    //                     "string:\"\"",
    //                 ])
    //                 .spawn()
    //                 .unwrap();
    //         }
    //     }
    // }
    //

    #[cfg(target_os = "macos")]
    {
        let mut child = Command::new("open").args(["-R", &path]).spawn().unwrap();
        child
            .wait()
            .expect("failed to wait for macos finder to end");
    }
}
