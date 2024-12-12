use std::io;

use native_db::db_type::Error;
use tauri::ipc::InvokeError;

#[derive(thiserror::Error, Debug)]
pub enum InitError {
    #[error("{0}")]
    Tuari(#[from] tauri::Error),
    #[error("{0:#?}")]
    Io(#[from] io::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum MangaShelfError {
    #[error("{0}")]
    Database(#[from] DatabaseError),
    #[error("{0}")]
    ReadDir(#[from] ReadDirError),
    #[error("{0:#?}")]
    Io(#[from] io::Error),
    #[error("{0}")]
    Tuari(#[from] tauri::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum DatabaseError {
    #[error("{0:#?}")]
    NativeDbError(#[from] Error),
    #[error("User Not Found: {0}")]
    UserNotFound(String),
    #[error("OsFolders Not Found: {0}")]
    OsFoldersNotFound(String),
    #[error("{0:#?}")]
    PanelsNotFound(String),
    #[error("{0:#?}")]
    IoError(#[from] io::Error),
    #[error("{0}")]
    Tuari(#[from] tauri::Error),
    #[error("failed to delete cover folder for path: {0}; reason: {1}")]
    DeleteCoverFolder(String, String),
    #[error("{0}")]
    SortType(#[from] SortTypeError),
}

#[derive(thiserror::Error, Debug)]
pub enum ReadDirError {
    #[error("{0}")]
    IoError(#[from] io::Error),
    #[error("{0} contains all the same folders & files as it did before")]
    FullyHydrated(String),
    #[error("{0:#?}")]
    Tuari(#[from] tauri::Error),
    #[error("path is invalid: {0}")]
    Path(String),
    #[error("{0}")]
    Image(#[from] image::ImageError),
    #[error("{0}")]
    MangaImage(#[from] MangaImageError),
}

#[derive(thiserror::Error, Debug)]
pub enum MangaImageError {
    #[error("{0}")]
    Io(#[from] io::Error),
    #[error("{0}")]
    Image(#[from] image::ImageError),
    #[error("could not get the pixel type from img: {0}")]
    InvalidPixelType(String),
    #[error("{0}")]
    Resize(#[from] fast_image_resize::ResizeError),
}

#[derive(thiserror::Error, Debug)]
pub enum HttpClientError {
    #[error("{0}")]
    Request(#[from] reqwest::Error),
    #[error("{0:#?}")]
    Tuari(#[from] tauri::Error),
    #[error("{0:#?}")]
    Io(#[from] io::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum SortTypeError {
    #[error("could not convert to SortType from &str: {0}")]
    FromStr(String),
}

impl From<SortTypeError> for InvokeError {
    fn from(error: SortTypeError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<MangaShelfError> for InvokeError {
    fn from(error: MangaShelfError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<ReadDirError> for InvokeError {
    fn from(error: ReadDirError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<HttpClientError> for InvokeError {
    fn from(error: HttpClientError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<DatabaseError> for InvokeError {
    fn from(error: DatabaseError) -> Self {
        InvokeError::from_error(error)
    }
}
