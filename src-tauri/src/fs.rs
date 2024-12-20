use crate::database::data::v1::User;
use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, Resizer};
use futures_util::future::join_all;
use hashbrown::{HashMap, HashSet};
use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ImageEncoder, ImageReader};
use rayon::slice::ParallelSliceMut;
use std::fs::File;
use std::io::BufWriter;
use std::iter::Iterator;
//use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
//use std::time::Instant;
use futures_util::TryStreamExt;
//use rayon::iter::IntoParallelRefIterator;
use rayon::iter::{IntoParallelIterator, IntoParallelRefMutIterator, ParallelIterator};
use std::{env, io};
use std::{fs::read_dir, process::Command};
use tokio::io::AsyncWriteExt;

use crate::database::data::v1::MangaPanel;
use crate::database::delete_panels;
use crate::database::{data::v1::OsFolder, update_os_folders};
use crate::database::{delete_os_folders, update_panels, FolderMetadata, HasPath, SortType};
use crate::misc::get_date_time;
use reqwest::Client;
use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

use crate::error::{
    DatabaseError, HttpClientError, MangaImageError, MangaShelfError, ReadDirError,
};

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
        } else if entry_path.is_dir() && read_dir(&entry_path)?.next().is_some() {
            child_folder_paths.push(entry_path.to_string_lossy().to_string());
            continue;
        }
    }

    Ok(())
}

type FolderGroup = (OsFolder, Vec<OsFolder>, Vec<MangaPanel>);

fn delete_stale_entries(
    handle: AppHandle,
    old_dirs: Vec<OsFolder>,
    old_panels: Vec<MangaPanel>,
    user: User,
) -> Result<(), DatabaseError> {
    delete_os_folders(handle.clone(), old_dirs, Some(user))?;
    delete_panels(&handle, old_panels)?;
    Ok(())
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum StaleEntries {
    Found {
        dirs: Option<HashSet<String>>,
        panels: Option<HashSet<String>>,
        deleted: Option<(Vec<OsFolder>, Vec<MangaPanel>)>,
    },
    None,
}

impl StaleEntries {
    pub fn is_none(&self) -> bool {
        matches!(self, StaleEntries::None)
    }
}

fn find_missing_paths<'a, O, I>(old: &[O], new: I) -> Option<HashSet<String>>
where
    O: HasPath,
    I: Iterator<Item = &'a String>,
{
    // Normalize old paths and collect them into a set.
    let old_paths: HashSet<String> = old.iter().map(|x| x.path().to_string()).collect();

    // Normalize new paths and collect them into a set.
    let new_paths: HashSet<String> = new.cloned().collect();

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

fn find_stale_metadata(
    old: &[MangaPanel],
    new: &HashSet<String>, // new is directly a HashSet<String>
) -> Option<HashSet<String>> {
    // Build a map of old panels for easy lookup by path.
    let old_map: HashMap<&str, &MangaPanel> = old.iter().map(|p| (p.path.as_str(), p)).collect();

    // Start with an empty set to store stale or missing paths.
    let mut result: HashSet<String> = HashSet::new();

    // Iterate over new panel paths to check both missing and stale metadata.
    new.iter().for_each(|new_path| {
        // Check if the panel exists in the old set.
        if let Some(old_panel) = old_map.get(new_path.as_str()) {
            // Check if the panel's metadata is stale.
            if old_panel.is_stale_metadata() {
                result.insert(new_path.clone()); // Add to result if metadata is stale.
            }
        } else {
            result.insert(new_path.clone()); // Add missing panel to result (panel was added).
        }
    });

    // Also check for any panels that were in `old` but not in `new` (deleted panels).
    old.iter().for_each(|old_panel| {
        // If a panel in `old` is missing from `new`, consider it missing.
        if !new.contains(old_panel.path()) {
            result.insert(old_panel.path().to_string());
        }
    });

    // Return the result if not empty, otherwise None.
    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

fn find_stale_entries(
    main_dir: &str,
    old_dirs: Option<&mut Vec<OsFolder>>,
    old_panels: Option<&mut Vec<MangaPanel>>,
) -> Result<StaleEntries, ReadDirError> {
    // Collect new directories and panels from the filesystem.
    let mut new_dirs = HashSet::new();
    let mut new_panels = HashSet::new();
    read_dir_helper(main_dir, &mut new_dirs, &mut new_panels)?;

    // If both old_dirs and old_panels are None, this is a fresh scan (no previous entries).
    if old_dirs.is_none() && old_panels.is_none() {
        return Ok(StaleEntries::None);
    }

    let old_dirs = match old_dirs {
        Some(dirs) => dirs,
        None => &mut Vec::new(),
    };

    let old_panels = match old_panels {
        Some(panels) => panels,
        None => &mut Vec::new(),
    };

    // Filter out missing panels (deleted panels)
    let deleted_panels: Vec<MangaPanel> = old_panels
        .iter()
        .filter_map(|pan| {
            if !path_exists(&pan.path) {
                return Some(pan.clone());
            }
            None
        })
        .collect();

    // Filter out missing directories (deleted dirs)
    let deleted_dirs: Vec<OsFolder> = old_dirs
        .iter()
        .filter_map(|dir| {
            if !path_exists(&dir.path) {
                return Some(dir.clone());
            }
            None
        })
        .collect();

    // Remove deleted panels and dirs from old_dirs and old_panels
    old_dirs.retain(|dir| !deleted_dirs.iter().any(|del| del.path == dir.path));
    old_panels.retain(|panel| !deleted_panels.iter().any(|del| del.path == panel.path));

    // Find missing paths (stale directories) and panels
    let dirs = find_missing_paths(old_dirs, new_dirs.iter());
    let panels = find_stale_metadata(old_panels, &new_panels);

    // Return the found stale entries, including deleted items
    match (
        &dirs,
        &panels,
        deleted_dirs.is_empty() && deleted_panels.is_empty(),
    ) {
        (None, None, true) => Ok(StaleEntries::None),
        _ => Ok(StaleEntries::Found {
            dirs,
            panels,
            deleted: Some((deleted_dirs, deleted_panels)),
        }),
    }
}

#[command]
pub async fn upsert_read_os_dir(
    handle: AppHandle,
    dir: String,
    parent_path: Option<String>,
    user: User,
    mut old_dirs: Option<Vec<OsFolder>>,
    mut old_panels: Option<Vec<MangaPanel>>,
) -> Result<bool, MangaShelfError> {
    let id = user.id.clone();
    // Find stale entries based on the provided directory and old data.
    let mut stale_entries = find_stale_entries(&dir, old_dirs.as_mut(), old_panels.as_mut())?;
    //println!("stale_entries: {:#?}", stale_entries);

    // If there are no stale entries and either `old_dirs` or `old_panels` is provided,
    // return `false` to prevent unnecessary re-rendering.
    if (old_dirs.is_some() || old_panels.is_some()) && stale_entries.is_none() {
        return Ok(false);
    }

    if let StaleEntries::Found {
        ref mut deleted, ..
    } = stale_entries
    {
        if let Some(deleted_entries) = deleted.take() {
            // Only move the deleted entries.
            delete_stale_entries(handle.clone(), deleted_entries.0, deleted_entries.1, user)?;
        }
    }

    if let StaleEntries::Found { dirs, panels, .. } = &stale_entries {
        if dirs.is_none() && panels.is_none() {
            stale_entries = StaleEntries::None
        }
    }

    let (main_folder, mut new_cfs, panels) =
        read_os_folder_dir(dir, id, None, parent_path, stale_entries)?;

    let app_data_dir = handle.path().app_data_dir()?;

    new_cfs.push(main_folder);
    let instant = std::time::Instant::now();
    let compressed_imgs: Vec<EncoderWriterPair> = new_cfs
        .par_iter_mut()
        .filter_map(|cf: &mut OsFolder| {
            if let Some(ref input) = cf.cover_img_path {
                let app_data_cover_img_path = format_cover_img_path(
                    input,
                    &app_data_dir,
                    (cf.parent_path.as_deref(), cf.path.as_ref()),
                )
                .ok();

                if let Some(Some(output)) = app_data_cover_img_path {
                    if let Ok(pair) = compress_cover_panel(input, &output) {
                        cf.cover_img_path = Some(output);
                        return Some(pair);
                    }
                }
            }
            None
        })
        .collect();

    let mut first_task = None;
    for (i, (dimg, encoder)) in compressed_imgs.into_iter().enumerate() {
        let task = tokio::spawn(async move {
            if let Err(e) = dimg.write_with_encoder(encoder) {
                eprintln!("{}", e);
            }
        });
        if i == 0 {
            first_task = Some(task);
        }
    }

    if let Some(first) = first_task {
        first.await.ok();
    }

    println!(
        "finished compressing {} folders in {}ms",
        new_cfs.len(),
        instant.elapsed().as_millis()
    );

    update_panels(&handle, panels, None)?;
    update_os_folders(handle, new_cfs, None)?;

    // Indicate whether a refetch was performed.
    Ok(true)
}

pub fn read_os_folder_dir(
    path: String,
    user_id: String,
    update_datetime: Option<(String, String)>,
    parent_path: Option<String>,
    stale_entries: StaleEntries,
) -> Result<FolderGroup, ReadDirError> {
    let mut childfolder_paths = HashSet::new();
    let mut panel_paths = HashSet::new();
    read_dir_helper(&path, &mut childfolder_paths, &mut panel_paths)?;

    let parent_path = parent_path.is_some().then(|| {
        Path::new(&path)
            .parent()
            .unwrap()
            .to_string_lossy()
            .to_string()
    });

    if childfolder_paths.is_empty() && panel_paths.is_empty() {
        return Err(ReadDirError::IoError(io::Error::new(
            io::ErrorKind::NotFound,
            format!("{path} contains 0 supported files."),
        )));
    } else {
        // Only filter if stale_entries is `Found`, otherwise process all paths.
        if let StaleEntries::Found { dirs, panels, .. } = stale_entries {
            let stale_dirs = dirs.unwrap_or_default();
            let stale_panels = panels.unwrap_or_default();

            // Filter out stale child folders that are not in the stale_dirs.
            childfolder_paths = stale_dirs;

            panel_paths = stale_panels;
        }
        // If stale_entries is `None`, do nothing, no filtering occurs.
    }
    let os_folder_path_clone = path.clone();
    let os_folder = Path::new(&os_folder_path_clone);
    let (update_date, update_time) = update_datetime.clone().unwrap_or_else(get_date_time);

    let mut total_child_folders: Vec<OsFolder> = Vec::new();
    let mut total_panels: Vec<MangaPanel> = Vec::new();
    let current_folders_panels: Vec<MangaPanel> = panel_paths
        .into_par_iter()
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

    total_panels.par_sort_by(SortType::sort(&SortType::EpisodeTitleRegex));

    let first_panel = total_panels.first().cloned();
    //println!("first_panel: {:?}", first_panel); // Debug statement
    let mut cover_img = first_panel.as_ref().map(|p| p.path.clone());

    let child_folders_group: Vec<FolderGroup> = childfolder_paths
        .into_par_iter()
        .filter_map(|folder_path| {
            match read_os_folder_dir(
                folder_path,
                user_id.clone(),
                update_datetime.clone(),
                Some(path.clone()),
                StaleEntries::None,
            ) {
                Ok(i) => Some(i),
                Err(e) => {
                    eprintln!("{}", e);
                    None
                }
            }
        })
        .collect();

    for group in child_folders_group.into_iter() {
        let (folder, c_folders, g_panels) = group;

        if cover_img.is_none() {
            if let Some(cover_img_path) = &folder.cover_img_path {
                cover_img = Some(cover_img_path.to_owned());
            }
        }

        total_panels.extend(g_panels);
        total_child_folders.push(folder);
        total_child_folders.extend(c_folders);
    }
    let metadata = FolderMetadata::from_path(&path, total_panels.len(), total_child_folders.len());

    let main_folder = OsFolder {
        user_id,
        path,
        title: os_folder.file_name().unwrap().to_string_lossy().to_string(),
        parent_path,
        last_read_panel: first_panel,
        cover_img_path: cover_img,
        metadata,
        is_manga_folder,
        is_double_panels: false,
        is_read: false,
        zoom: 100,
        is_hidden: false,
        update_date,
        update_time,
    };

    Ok((main_folder, total_child_folders, total_panels))
}

fn format_cover_img_path(
    img_path: &str,
    app_data_dir: &Path,
    parent_paths: (Option<&str>, &str),
) -> Result<Option<String>, ReadDirError> {
    let file_title = Path::new(&img_path).file_stem().ok_or_else(|| {
        eprintln!("Error: Invalid file title for cover_img: {}", img_path);
        ReadDirError::Path(img_path.to_string())
    })?;

    #[allow(unused_assignments)]
    let mut final_path = None;
    let (super_parent, parent) = parent_paths;
    let parent_dir_title = Path::new(&parent).file_name().ok_or_else(|| {
        eprintln!("Error: Invalid parent_dir_title for path: {}", parent);
        ReadDirError::Path(parent.to_string())
    })?;
    if let Some(super_parent) = super_parent {
        let super_parent_title = Path::new(&super_parent).file_name().ok_or_else(|| {
            eprintln!(
                "Error: Invalid super_parent_title for parent: {}",
                super_parent
            );
            ReadDirError::Path(super_parent.to_string())
        })?;

        let cover_path = app_data_dir
            .join("covers")
            .join(super_parent_title)
            .join(parent_dir_title)
            .join(file_title)
            .with_extension("cmp.jpg")
            .to_string_lossy()
            .to_string();
        final_path = Some(cover_path);
    } else {
        let cover_path = app_data_dir
            .join("covers")
            .join(parent_dir_title)
            .join(file_title)
            .with_extension("cmp.jpg")
            .to_string_lossy()
            .to_string();
        final_path = Some(cover_path);
    }
    Ok(final_path)
}

pub type EncoderWriterPair = (DynamicImage, JpegEncoder<BufWriter<File>>);

pub fn compress_cover_panel(
    input: impl AsRef<Path>,
    output: impl AsRef<Path>,
) -> Result<EncoderWriterPair, MangaImageError> {
    let img_path = input.as_ref();
    let output = output.as_ref();
    let img = image::open(img_path)?;
    let max_size = 1200;

    let resized = img.thumbnail(max_size, max_size);
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let output_file = File::create(output).unwrap();
    let buf = BufWriter::new(output_file);
    let encoder = JpegEncoder::new_with_quality(buf, 95);
    //resized.write_with_encoder(encoder)?;

    Ok((resized, encoder))
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
pub fn path_exists(path: &str) -> bool {
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
