use std::{
    fs::create_dir,
    io,
    path::{Path, PathBuf},
    sync::LazyLock,
    time::SystemTime,
};

use data::v1::{MangaPanel, MangaPanelKey, OsFolder, OsFolderKey, User};
use native_db::*;
use rayon::slice::ParallelSliceMut;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};

use crate::{
    error::{DatabaseError, ReadDirError},
    fs::HasPath,
    misc::get_date_time,
};

pub static EPISODE_TITLE_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    regex::Regex::new(
        r"(?i)(?:S\d{1,2}E|第|EP?|Episode|Ch|Chapter|Vol|Volume|#)?\s*(\d{1,3})(?:話|巻|章|節|[._\-\s]|$)",
    )
    .unwrap()
});

#[derive(Serialize, Deserialize, Clone, Debug, Eq, Hash, PartialEq)]
pub struct FileMetadata {
    pub created: Option<SystemTime>,
    pub modified: Option<SystemTime>,
    pub accessed: Option<SystemTime>,
    pub size: Option<u64>,
}

impl FileMetadata {
    // Constructor to get metadata of a file
    pub fn from_path(path: impl AsRef<Path>) -> Option<Self> {
        let metadata = std::fs::metadata(path).ok();

        if let Some(metadata) = metadata {
            let modified = metadata.modified().ok();
            let created = metadata.created().ok();
            let accessed = metadata.accessed().ok();
            let size = Some(metadata.len());

            return Some(Self {
                modified,
                created,
                accessed,
                size,
            });
        }

        None
    }
}

pub mod data {
    use native_db::{native_db, ToKey};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};

    pub mod v1 {
        use crate::database::FileMetadata;

        use super::*;

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 1, version = 1)]
        #[native_db]
        pub struct User {
            #[primary_key]
            pub id: String,
            #[secondary_key(unique)]
            pub username: String,
            pub settings: Settings,
        }

        #[derive(Serialize, Deserialize, Clone, Debug)]
        #[native_model(id = 2, version = 1)]
        #[native_db]
        pub struct Settings {
            #[primary_key]
            pub user_id: String,
            pub mpv_path: Option<String>,
            pub plugins_path: Option<String>,
            pub autoplay: bool,
            pub update_date: String,
            pub update_time: String,
        }

        #[derive(Serialize, Deserialize, Clone, Debug)]
        #[native_model(id = 3, version = 1)]
        #[native_db]
        pub struct OsFolder {
            #[secondary_key]
            pub user_id: String,
            #[primary_key]
            pub path: String,
            pub title: String,
            #[secondary_key]
            pub parent_path: Option<String>,
            pub last_read_panel: Option<MangaPanel>,
            pub cover_img_path: Option<String>,
            pub is_manga_folder: bool,
            pub is_double_panels: bool,
            pub is_read: bool,
            pub zoom: usize,
            pub is_hidden: bool,
            pub update_date: String,
            pub update_time: String,
        }

        #[derive(Serialize, Deserialize, Clone, Debug, Eq, Hash, PartialEq)]
        #[native_model(id = 4, version = 1)]
        #[native_db]
        pub struct MangaPanel {
            #[secondary_key]
            pub user_id: String,
            #[primary_key]
            pub path: String,
            pub title: String,
            #[secondary_key]
            pub parent_path: String,
            pub metadata: Option<FileMetadata>,
            // pub height: u32,
            // pub width: u32,
            pub is_read: bool,
            pub update_date: String,
            pub update_time: String,
        }
    }
}

static DBMODELS: LazyLock<Models> = LazyLock::new(|| {
    let mut models = Models::new();
    models.define::<data::v1::User>().unwrap();
    models.define::<data::v1::OsFolder>().unwrap();
    models.define::<data::v1::MangaPanel>().unwrap();
    models
});

impl HasPath for OsFolder {
    fn path(&self) -> &str {
        self.path.as_ref()
    }
}

impl HasPath for MangaPanel {
    fn path(&self) -> &str {
        self.path.as_ref()
    }
}

impl MangaPanel {
    pub fn new(
        user_id: String,
        parent_path: String,
        path: String,
        update_date: String,
        update_time: String,
    ) -> Result<MangaPanel, ReadDirError> {
        let title = Path::new(&path)
            .file_name()
            .ok_or_else(|| {
                ReadDirError::IoError(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    format!("'{path}' contained invalid characters when trying to get the OsVideo title."),
                ))
            })?
            .to_string_lossy()
            .to_string();

        let metadata = FileMetadata::from_path(&path);

        // Create MangaPanel instance
        let vid = MangaPanel {
            user_id,
            parent_path,
            path,
            title,
            metadata,
            is_read: false,
            update_date,
            update_time,
        };

        Ok(vid)
    }

    pub fn is_stale_metadata(&self) -> bool {
        if let Some(ref current_metadata) = self.metadata {
            // Fetch the current metadata of the file
            match FileMetadata::from_path(&self.path) {
                Some(new_metadata) => {
                    // Compare the modified time and size
                    current_metadata.modified != new_metadata.modified
                        || current_metadata.size != new_metadata.size
                }
                None => true, // If metadata can't be fetched, assume it's stale
            }
        } else {
            true // If no metadata is stored, consider it stale
        }
    }

    // Update the manga panel's metadata
    pub fn update_metadata(&mut self) {
        if let Some(new_metadata) = FileMetadata::from_path(&self.path) {
            self.metadata = Some(new_metadata);
        }
    }
}

pub fn init_database(app_data_dir: &PathBuf, handle: &AppHandle) -> Result<(), db_type::Error> {
    if !app_data_dir.exists() {
        std::fs::create_dir(app_data_dir)?;
        std::fs::create_dir(app_data_dir.join("frames"))?;
    }
    let plugins_dir = app_data_dir.join("plugins");
    if !plugins_dir.exists() {
        create_dir(plugins_dir).unwrap();
    }
    let db_path = app_data_dir.join("main").with_extension("rdb");
    Builder::new().create(&DBMODELS, &db_path)?;

    handle.manage(db_path);
    Ok(())
}

#[command]
pub fn get_os_folders(handle: AppHandle, user_id: String) -> Result<Vec<OsFolder>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::user_id)?
        .start_with(user_id.as_str())?
        .try_collect()?;

    folders.retain(|folder| folder.parent_path.is_none());

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 OsFolders found belonging to user_id: {user_id}",
        )));
    }

    Ok(folders)
}

#[command]
pub fn get_os_folder_by_path(
    handle: AppHandle,
    folder_path: String,
) -> Result<OsFolder, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let folder: Option<OsFolder> = rtx.get().primary(folder_path.as_str())?;

    if let Some(folder) = folder {
        return Ok(folder);
    }

    Err(DatabaseError::OsFoldersNotFound(format!(
        "OsFolder found not found from path: {folder_path}",
    )))
}

#[command]
pub fn get_os_folders_by_path(
    handle: AppHandle,
    parent_path: String,
) -> Result<Vec<OsFolder>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::parent_path)? // Specify the index for filtering
        .all()? // Result<Iterator<Item = Result<OsFolder, Error>>>
        .filter_map(|result| result.ok()) // Extract successful `OsFolder` values, skipping errors
        .filter(|folder: &OsFolder| folder.parent_path.as_deref() == Some(parent_path.as_str())) // Match parent_path
        .collect();

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 child folders found in dir: {parent_path}",
        )));
    }

    folders.par_sort_by(|a, b| {
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

    Ok(folders)
}

#[command]
pub fn update_os_folders(
    handle: AppHandle,
    os_folders: Vec<OsFolder>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    for mut folder in os_folders {
        //println!("updating dir: {}", folder.path);

        folder.update_date = date.clone();
        folder.update_time = time.clone();

        rtx.upsert(folder)?;
    }

    rtx.commit()?;

    Ok(())
}

#[command]
pub fn update_panels(
    handle: &AppHandle,
    os_videos: Vec<MangaPanel>,
    watched: Option<bool>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    for mut vid in os_videos {
        vid.update_date = date.clone();
        vid.update_time = time.clone();

        if let Some(watched) = watched {
            vid.is_read = watched;
        }

        rtx.upsert(vid)?;
    }

    rtx.commit()?;

    Ok(())
}

#[command]
pub fn get_panels(
    handle: AppHandle,
    parent_path: String,
) -> Result<Vec<MangaPanel>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut panels: Vec<MangaPanel> = rtx
        .scan()
        .secondary(MangaPanelKey::parent_path)?
        .start_with(parent_path.as_str())?
        .take_while(|e: &Result<MangaPanel, db_type::Error>| match e {
            Ok(vid) => vid.parent_path == parent_path,
            Err(_) => false,
        })
        .try_collect()?;

    if panels.is_empty() {
        return Err(DatabaseError::PanelsNotFound(format!(
            "0 Panels found belonging to: {parent_path}",
        )));
    }

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

    //println!("{:#?}", folders);

    Ok(panels)
}

pub fn delete_panels(handle: &AppHandle, panels: Vec<MangaPanel>) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rwtx = db.rw_transaction()?;

    for p in panels {
        rwtx.remove(p)?;
    }

    rwtx.commit()?;

    Ok(())
}

#[command]
pub fn delete_os_folders(
    handle: AppHandle,
    os_folders: Vec<OsFolder>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rwtx = db.rw_transaction()?;

    for folder in os_folders {
        // Retrieve all direct child folders
        let child_folders: Vec<OsFolder> = rwtx
            .scan()
            .secondary(OsFolderKey::parent_path)?
            .start_with(Some(folder.path.as_str()))?
            .try_collect()?;

        // Collect all panels for the current folder and its child folders
        let panels: Vec<MangaPanel> = rwtx
            .scan()
            .secondary(MangaPanelKey::parent_path)?
            .start_with(folder.path.as_str())?
            .try_collect()?;

        // Delete all panels within the folder and its child folders
        for panel in panels {
            rwtx.remove(panel)?;
        }

        // Delete all child folders
        for f in child_folders {
            rwtx.remove(f)?;
        }

        // Finally, delete the folder itself
        rwtx.remove(folder)?;
    }

    rwtx.commit()?;

    Ok(())
}

#[command]
pub fn get_default_user(handle: AppHandle) -> Result<User, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let user: Option<User> = rtx.get().primary("1")?;

    user.ok_or_else(|| DatabaseError::UserNotFound(String::from("User with ID 1 not found.")))
}

#[command]
pub fn get_user_by_id(handle: AppHandle, user_id: String) -> Result<User, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let user: Option<User> = rtx.get().primary(user_id.as_str())?;

    user.ok_or_else(|| DatabaseError::UserNotFound(format!("User with ID {user_id} not found.")))
}

#[command]
pub fn update_user(user: User, handle: AppHandle) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.rw_transaction()?;
    rtx.upsert(user)?;
    rtx.commit()?;

    Ok(())
}

#[command]
pub fn get_prev_folder(
    handle: AppHandle,
    parent_path: String,
    current_folder: OsFolder,
) -> Result<OsFolder, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::parent_path)?
        .start_with(Some(parent_path.as_str()))?
        .try_collect()?;

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 child folders found in dir: {parent_path}",
        )));
    }

    folders.sort_by(|a, b| {
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

    match folders
        .into_iter()
        .rev()
        .skip_while(|folder| folder.path != current_folder.path)
        .nth(1)
    {
        Some(pf) => Ok(pf),
        None => Err(DatabaseError::OsFoldersNotFound(format!(
            "could not get first child folder from parent: {parent_path}",
        ))),
    }
}

#[command]
pub fn get_next_folder(
    handle: AppHandle,
    parent_path: String,
    current_folder: OsFolder,
) -> Result<OsFolder, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::parent_path)?
        .start_with(Some(parent_path.as_str()))?
        .try_collect()?;

    if folders.is_empty() {
        return Err(DatabaseError::OsFoldersNotFound(format!(
            "0 child folders found in dir: {parent_path}",
        )));
    }

    folders.sort_by(|a, b| {
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

    match folders
        .into_iter()
        .skip_while(|folder| folder.path != current_folder.path)
        .nth(1)
    {
        Some(nf) => Ok(nf),
        None => Err(DatabaseError::OsFoldersNotFound(format!(
            "could not get first child folder from parent: {parent_path}",
        ))),
    }
}
