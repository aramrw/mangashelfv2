use std::{
    fs::{self, read_dir},
    io,
    path::{Path, PathBuf},
    str::FromStr,
    sync::LazyLock,
    time::{Duration, SystemTime},
};

use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use data::v1::{MangaPanel, MangaPanelKey, OsFolder, OsFolderKey, User};
use native_db::*;
use rayon::slice::ParallelSliceMut;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};

use crate::{
    error::{DatabaseError, ReadDirError, SortTypeError},
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

#[derive(Serialize, Deserialize, Clone, Debug, Eq, Hash, PartialEq)]
pub struct FolderMetadata {
    contains: FolderContains,
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Eq, Hash, PartialEq)]
pub struct FolderContains {
    files: usize,
    folders: usize,
}

// Serialize SystemTime as u64 (seconds since epoch)
fn _serialize_system_time<S>(time: &Option<SystemTime>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match time {
        Some(t) => {
            let duration_since_epoch = t.duration_since(SystemTime::UNIX_EPOCH).unwrap();
            serializer.serialize_some(&duration_since_epoch.as_secs())
        }
        None => serializer.serialize_none(),
    }
}

// Deserialize u64 back into SystemTime
fn _deserialize_system_time<'de, D>(deserializer: D) -> Result<Option<SystemTime>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let seconds: Option<u64> = Option::deserialize(deserializer)?;
    Ok(seconds.map(|sec| SystemTime::UNIX_EPOCH + Duration::new(sec, 0)))
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

impl FolderMetadata {
    pub fn from_path(path: impl AsRef<Path>, img_len: usize, dir_len: usize) -> Option<Self> {
        let metadata = std::fs::metadata(path).ok();
        if let Some(metadata) = metadata {
            let size = Some(metadata.len());
            let contains = FolderContains {
                files: img_len,
                folders: dir_len,
            };

            return Some(Self { size, contains });
        }
        None
    }
}

pub mod data {
    use native_db::{native_db, ToKey};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};

    pub mod v1 {
        use crate::database::{FileMetadata, FolderMetadata};

        use super::*;

        /// mangashelf user type
        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 1, version = 1)]
        #[native_db]
        pub struct User {
            #[primary_key]
            pub id: String,
            #[secondary_key(unique)]
            pub username: String,
            pub settings: Settings,
            pub last_read_manga_folder: Option<OsFolder>,
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
            pub metadata: Option<FolderMetadata>,
            // everything below should be put into a struct at some point to organize
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

pub trait HasPath {
    fn path(&self) -> &str;
}

pub trait HasTitle {
    fn title(&self) -> &str;
}

pub trait HasDatetime {
    fn date(&self) -> &str;
    fn time(&self) -> &str;
    fn get_naive_datetime(&self) -> Result<NaiveDateTime, chrono::ParseError> {
        let date = &self.date(); // "2024-11-30"
        let mut time = self.time().to_string(); // "10:43pm"

        time.replace_range(time.len() - 2.., "");

        let naive_date = NaiveDate::parse_from_str(date, "%Y-%m-%d")?;
        let naive_time = NaiveTime::parse_from_str(&time, "%H:%M")?;

        // Return combined NaiveDateTime
        Ok(NaiveDateTime::new(naive_date, naive_time))
    }
}

// path
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

// title
impl HasTitle for OsFolder {
    fn title(&self) -> &str {
        self.title.as_ref()
    }
}

impl HasTitle for MangaPanel {
    fn title(&self) -> &str {
        self.title.as_ref()
    }
}

// datetime
impl HasDatetime for OsFolder {
    fn date(&self) -> &str {
        &self.update_date
    }
    fn time(&self) -> &str {
        &self.update_time
    }
}

impl HasDatetime for MangaPanel {
    fn date(&self) -> &str {
        &self.update_date
    }
    fn time(&self) -> &str {
        &self.update_time
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
                    //current_metadata.modified != new_metadata.modified ||
                    current_metadata.size != new_metadata.size
                }
                None => true, // If metadata can't be fetched, assume it's stale
            }
        } else {
            true // If no metadata is stored, consider it stale
        }
    }

    // Update the manga panel's metadata
    pub fn _update_metadata(&mut self) {
        if let Some(new_metadata) = FileMetadata::from_path(&self.path) {
            self.metadata = Some(new_metadata);
        }
    }
}

impl OsFolder {
    pub fn delete_app_data_cover_folder(&self, app_data_dir: &Path) -> Result<(), io::Error> {
        //dbg!(app_data_dir);
        for e in read_dir(app_data_dir.join("covers"))? {
            let e = e?;
            let name = e.file_name();
            let name = name.to_str();
            if e.path().is_dir() {
                if let Some(dirname) = name {
                    if self.title == dirname {
                        fs::remove_dir_all(e.path())?;
                    }
                }
            } else if e.path().is_file() {
                if let Some(ci_path) = &self.cover_img_path {
                    if let Some(filename) = name {
                        if ci_path == filename {
                            fs::remove_file(e.path())?;
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

pub fn init_database(app_data_dir: &Path, handle: &AppHandle) -> Result<(), db_type::Error> {
    if !app_data_dir.exists() {
        std::fs::create_dir_all(app_data_dir.join("covers"))?;
    }
    let db_path = app_data_dir.join("main").with_extension("rdb");
    Builder::new().create(&DBMODELS, &db_path)?;

    handle.manage(db_path);
    Ok(())
}

// sort type

#[non_exhaustive]
#[derive(Debug, Clone)]
pub enum SortType {
    None,
    EpisodeTitleRegex,
    Updated,
}

impl SortType {
    pub fn sort<T>(&self) -> impl Fn(&T, &T) -> std::cmp::Ordering
    where
        T: HasDatetime + HasTitle,
    {
        match self {
            SortType::Updated => |a: &T, b: &T| {
                let a_dt = a.get_naive_datetime().unwrap_or_default();
                let b_dt = b.get_naive_datetime().unwrap_or_default();
                //println!("a_dt: {:?}, b_dt: {:?}", a_dt, b_dt);
                b_dt.cmp(&a_dt)
            },
            SortType::EpisodeTitleRegex => |a: &T, b: &T| {
                let num_a = EPISODE_TITLE_REGEX
                    .captures(a.title())
                    .and_then(|caps| caps.get(caps.len() - 1))
                    .and_then(|m| m.as_str().parse::<u32>().ok())
                    .unwrap_or(0);

                let num_b = EPISODE_TITLE_REGEX
                    .captures(b.title())
                    .and_then(|caps| caps.get(caps.len() - 1))
                    .and_then(|m| m.as_str().parse::<u32>().ok())
                    .unwrap_or(0);

                num_a.cmp(&num_b)
            },
            _ => |_: &T, _: &T| std::cmp::Ordering::Equal,
        }
    }
}

impl FromStr for SortType {
    type Err = SortTypeError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "none" => Ok(Self::None),
            "episode_title_regex" => Ok(Self::EpisodeTitleRegex),
            "updated" => Ok(Self::Updated),
            _ => Err(SortTypeError::FromStr(s.to_string())),
        }
    }
}

// tauri cmds

#[command]
pub fn get_os_folders(
    handle: AppHandle,
    user_id: String,
    sort_type: String,
) -> Result<Vec<OsFolder>, DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().create(&DBMODELS, db_path)?;

    let rtx = db.r_transaction()?;
    let mut folders: Vec<OsFolder> = rtx
        .scan()
        .secondary(OsFolderKey::user_id)?
        .start_with(user_id.as_str())?
        .try_collect()?;

    folders.retain(|folder| folder.parent_path.is_none());
    let sort_type = SortType::from_str(&sort_type)?;
    folders.par_sort_by(sort_type.sort());

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
    sort_type: String,
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

    let sort_type = SortType::from_str(&sort_type)?;
    folders.par_sort_by(sort_type.sort());

    Ok(folders)
}

#[command]
pub fn update_os_folders(
    handle: AppHandle,
    os_folders: Vec<OsFolder>,
    user: Option<User>,
) -> Result<(), DatabaseError> {
    let db_path = handle.state::<PathBuf>().to_string_lossy().to_string();
    let db = Builder::new().open(&DBMODELS, db_path)?;
    let rwtx = db.rw_transaction()?;
    let (date, time) = get_date_time();

    // the user only gets passed from the reader
    // meaning that we should update the last nested folder read
    // to display on the dashboard
    if let Some(mut user) = user {
        user.last_read_manga_folder = os_folders.first().cloned();
        // println!(
        //     "updating the users last read manga folder to: {:#?}",
        //     user.last_read_manga_folder,
        // );
        rwtx.upsert(user)?;
    }

    for mut folder in os_folders {
        folder.update_date = date.clone();
        folder.update_time = time.clone();

        rwtx.upsert(folder)?;
    }

    rwtx.commit()?;

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

    panels.par_sort_by(SortType::sort(&SortType::EpisodeTitleRegex));

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
    mut user: Option<User>,
) -> Result<(), DatabaseError> {
    let app_data_dir = handle.path().app_data_dir()?;
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
            if let Some(ref mut user) = user {
                if let Some(lrmf) = &user.last_read_manga_folder {
                    if f.path == lrmf.path {
                        println!("the last read user folder is one that needs to be deleted");
                        user.last_read_manga_folder = None;
                    }
                }
            }

            rwtx.remove(f)?;
        }

        folder
            .delete_app_data_cover_folder(&app_data_dir)
            .map_err(|e| DatabaseError::DeleteCoverFolder(folder.path.clone(), e.to_string()))?;

        if let Some(ref mut user) = user {
            if let Some(lrmf) = &user.last_read_manga_folder {
                if folder.path == lrmf.path {
                    println!("the last read user folder is one that needs to be deleted");
                    user.last_read_manga_folder = None;
                }
            }
        }

        // Finally, delete the folder itself
        rwtx.remove(folder)?;
    }

    if let Some(user) = user {
        //dbg!(&user);
        rwtx.upsert(user)?;
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

    folders.par_sort_by(SortType::sort(&SortType::EpisodeTitleRegex));

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

    folders.par_sort_by(SortType::sort(&SortType::EpisodeTitleRegex));

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
