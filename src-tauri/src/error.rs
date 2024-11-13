use std::{io, path::PathBuf, string::FromUtf8Error};

use native_db::db_type::Error;
use tauri::ipc::InvokeError;

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
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
}

#[derive(thiserror::Error, Debug)]
pub enum MpvError {
    #[error("MPV Player was not found on the System PATH.")]
    SudoPATHNotFound,
    #[error("MPV Player was not found @ the specified path: {0}")]
    AbsolutePathNotFound(String),
    #[error("Failed to execute MPV Player: {0}")]
    IoError(#[from] io::Error),
    #[error("{0:#?}")]
    TuariError(#[from] tauri::Error),
    #[error("Failed to get Webview Window labeled: {0}")]
    WebviewWindowNotFound(String),
    #[error("OsVideo {0} not found in specified directory.")]
    OsVideoNotFound(String),
    #[error("Filename contains invalid characters: {0}")]
    InvalidPathName(String),
    #[error("{0}")]
    DatabaseError(#[from] DatabaseError),
    #[error("Failed to extract video title: {0} from stdout: {1}")]
    MissingStdoutVideoTitle(String, String),
    #[error("Failed to convert stdout bytes to String: {0}")]
    Utf8Error(#[from] FromUtf8Error),
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

impl From<HttpClientError> for InvokeError {
    fn from(error: HttpClientError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<PathBuf> for MpvError {
    fn from(path: PathBuf) -> Self {
        MpvError::OsVideoNotFound(path.to_string_lossy().to_string())
    }
}

impl From<MpvError> for InvokeError {
    fn from(error: MpvError) -> Self {
        InvokeError::from_error(error)
    }
}

impl From<DatabaseError> for InvokeError {
    fn from(error: DatabaseError) -> Self {
        InvokeError::from_error(error)
    }
}
