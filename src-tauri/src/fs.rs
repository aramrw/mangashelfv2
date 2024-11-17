use std::collections::HashSet;
use std::path::{Path, PathBuf};
//use std::time::Instant;
use futures_util::TryStreamExt;
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use rayon::slice::ParallelSliceMut;
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

use crate::error::{HttpClientError, MangaShelfError, ReadDirError};

use phf::phf_set;

pub static SUPPORTED_IMAGE_FORMATS: phf::Set<&'static str> = phf_set! {
    "jpg", "jpeg", "png", "gif", "bmp", "tiff",  "webp", "svg",  "heif",
    "raw", "ico", "apng", "jfif", "exi",
};

fn read_dir_helper(
    path: &str,
    child_folder_paths: &mut Vec<String>,
    panel_paths: &mut Vec<String>,
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

#[command]
pub fn upsert_read_os_dir(
    handle: AppHandle,
    parent_path: String,
    user_id: String,
    c_folders: Option<Vec<OsFolder>>,
    c_panels: Option<Vec<MangaPanel>>,
) -> Result<bool, MangaShelfError> {
    let mut delete_f = Vec::new();
    let mut delete_p = Vec::new();

    if let Some(c_folders) = &c_folders {
        for sf in c_folders {
            if !Path::new(&sf.path).exists() {
                delete_f.push(sf.clone())
            }
        }
    }

    if let Some(c_panels) = &c_panels {
        for sp in c_panels {
            if !Path::new(&sp.path).exists() {
                delete_p.push(sp.clone());
            }
        }
    }

    if !delete_f.is_empty() {
        delete_os_folders(handle.clone(), delete_f)?;
    }
    if !delete_p.is_empty() {
        delete_panels(&handle, delete_p)?;
    }

    let group = match read_os_folder_dir(
        handle.clone(),
        parent_path,
        user_id,
        None,
        None,
        c_folders,
        c_panels,
    ) {
        Ok(g) => g,
        Err(ReadDirError::FullyHydrated(_)) => return Ok(false),
        Err(e) => return Err(MangaShelfError::ReadDir(e)),
    };

    let (main_folder, mut new_cfs, panels) = group;

    update_panels(&handle, panels, None)?;
    new_cfs.push(main_folder);
    update_os_folders(handle.clone(), new_cfs.clone())?;

    Ok(true)
}

type FolderGroup = (OsFolder, Vec<OsFolder>, Vec<MangaPanel>);
pub trait HasPath {
    fn path(&self) -> &str;
}

fn is_stale<O>(old: &[O], new: &[String]) -> bool
where
    O: HasPath,
{
    // Collect old paths into a HashSet for quick lookup
    let old_paths: HashSet<&str> = old.iter().map(|x| x.path()).collect();
    let new_paths: HashSet<&str> = new.iter().map(|x| x.as_str()).collect();

    // Check if there's any new path not in old paths OR any old path not in new paths
    old_paths != new_paths
}

#[command]
pub fn read_os_folder_dir(
    handle: AppHandle,
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
    c_folders: Option<Vec<OsFolder>>,
    c_panels: Option<Vec<MangaPanel>>,
) -> Result<FolderGroup, ReadDirError> {
    let mut childfolder_paths: Vec<String> = Vec::new();
    let mut panel_paths: Vec<String> = Vec::new();
    let mut update_datetime = update_datetime;
    read_dir_helper(&path, &mut childfolder_paths, &mut panel_paths)?;

    if childfolder_paths.is_empty() && panel_paths.is_empty() {
        return Err(ReadDirError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    } else if let Some(c_folders) = c_folders {
        if !is_stale(&c_folders, &childfolder_paths) {
            return Err(ReadDirError::FullyHydrated(path));
        }
    }
    if let Some(c_panels) = c_panels {
        // If panels are not stale, this only checks path names
        if !is_stale(&c_panels, &panel_paths) {
            // Check each panel's metadata to make sure even tho all the file names
            // are the same the metadata hasnt been changed
            let all_panels_up_to_date = c_panels.iter().all(|p| !p.is_stale_metadata());

            if all_panels_up_to_date {
                // If all panels are up-to-date (not stale), exit early with FullyHydrated
                return Err(ReadDirError::FullyHydrated(path));
            }
        }
    }
    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    if update_datetime.is_none() {
        let (update_date, update_time) = get_date_time();
        update_datetime = Some((update_date, update_time));
    }

    let update_date = update_datetime.clone().unwrap().0;
    let update_time = update_datetime.clone().unwrap().1;

    let mut total_child_folders: Vec<OsFolder> = Vec::new();
    let mut total_panels: Vec<MangaPanel> = Vec::new();
    let mut current_folders_panels: Vec<MangaPanel> = panel_paths
        .into_par_iter()
        .filter_map(|vid_path| {
            MangaPanel::new(
                user_id.clone(),
                path.clone(),
                vid_path,
                update_date.clone(),
                update_time.clone(),
            )
            .ok()
        })
        .collect::<Vec<MangaPanel>>();
    let is_manga_folder = !current_folders_panels.is_empty();
    current_folders_panels.par_sort_by(|a, b| {
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

    total_panels.extend(current_folders_panels);

    let mut cover_img = None;
    let first_panel = total_panels.first().cloned();
    if let Some(first_panel) = &first_panel {
        cover_img = Some(first_panel.path.clone());
    }

    let child_folders_group: Vec<FolderGroup> = childfolder_paths
        .into_par_iter()
        .filter_map(|folder_path| {
            read_os_folder_dir(
                handle.clone(),
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
                None,
                None,
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
