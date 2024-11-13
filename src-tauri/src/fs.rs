use std::path::{Path, PathBuf};
//use std::time::Instant;
use futures_util::TryStreamExt;
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use std::{env, io};
use std::{fs::read_dir, process::Command};
use tokio::io::AsyncWriteExt;

use crate::database::data::v1::MangaPanel;
use crate::database::update_panels;
use crate::database::EPISODE_TITLE_REGEX;
use crate::misc::get_date_time;
use crate::{
    database::{data::v1::OsFolder, update_os_folders},
    error::DatabaseError,
};
use reqwest::Client;
use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

use crate::error::HttpClientError;

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
pub fn read_os_folder_dir(
    handle: AppHandle,
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
) -> Result<OsFolder, DatabaseError> {
    let mut child_folder_paths: Vec<String> = Vec::new();
    let mut panel_paths: Vec<String> = Vec::new();
    let mut update_datetime = update_datetime;

    read_dir_helper(&path, &mut child_folder_paths, &mut panel_paths)?;
    if child_folder_paths.is_empty() && panel_paths.is_empty() {
        return Err(DatabaseError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    }

    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    if update_datetime.is_none() {
        let (update_date, update_time) = get_date_time();
        update_datetime = Some((update_date, update_time));
    }

    let update_date = update_datetime.clone().unwrap().0;
    let update_time = update_datetime.clone().unwrap().1;

    let mut panels: Vec<MangaPanel> = panel_paths
        .into_par_iter()
        .filter_map(|vid_path| {
            create_manga_panel(
                user_id.clone(),
                path.clone(),
                vid_path,
                update_date.clone(),
                update_time.clone(),
            )
            .ok()
        })
        .collect::<Vec<MangaPanel>>();

    let mut child_folders: Vec<OsFolder> = child_folder_paths
        .into_iter()
        .filter_map(|folder_path| {
            read_os_folder_dir(
                handle.clone(),
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
            )
            .ok()
        })
        .collect();

    panels.sort_by(|a, b| {
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

    let first_panel = panels.first().cloned();
    let mut cover_img = None;
    if let Some(first_panel) = &first_panel {
        cover_img = Some(first_panel.path.clone());
    } else if !child_folders.is_empty() {
        if let Some(first) = child_folders.first() {
            cover_img = first.cover_img_path.clone();
        }
    }

    let folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        parent_path,
        last_read_panel: first_panel,
        cover_img_path: cover_img,
        is_manga_folder: !panels.is_empty(),
        is_double_panels: false,
        zoom: 100,
        update_date,
        update_time,
    };

    child_folders.push(folder.clone());

    update_panels(&handle, panels, None)?;
    update_os_folders(handle, child_folders)?;

    Ok(folder)
}

fn create_manga_panel(
    user_id: String,
    parent_path: String,
    path: String,
    update_date: String,
    update_time: String,
) -> Result<MangaPanel, DatabaseError> {
    let title =
        Path::new(&path)
            .file_name()
            .ok_or_else(|| {
                DatabaseError::IoError(io::Error::new(
        io::ErrorKind::InvalidInput,
        format!("'{path}' contained invalid characters when trying get the the OsVideo title."),
    ))
            })?
            .to_string_lossy()
            .to_string();

    let vid = MangaPanel {
        user_id,
        parent_path,
        path,
        title,
        is_read: false,
        update_date,
        update_time,
    };

    Ok(vid)
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
