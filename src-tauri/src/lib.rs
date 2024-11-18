#![feature(iterator_try_collect)]

use database::init_database;
use tauri::Manager;
use tray::kill_dup_process;

mod database;
mod error;
mod fs;
mod misc;
mod tray;

use crate::database::{
    delete_os_folders, get_default_user, get_next_folder, get_os_folder_by_path, get_os_folders,
    get_os_folders_by_path, get_panels, get_prev_folder, get_user_by_id, update_os_folders,
    update_user,
};
use crate::fs::{
    check_cover_img_exists, download_mpv_binary, path_exists, read_os_folder_dir, show_in_folder,
    upsert_read_os_dir,
};
use crate::tray::init_tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let handle = app.handle();
            let app_data_dir = handle.path().app_data_dir().unwrap();
            init_database(&app_data_dir, handle).unwrap();
            kill_dup_process();
            init_tray(app).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_default_user,
            get_user_by_id,
            update_user,
            get_os_folders,
            get_os_folder_by_path,
            get_os_folders_by_path,
            get_prev_folder,
            get_next_folder,
            update_os_folders,
            delete_os_folders,
            read_os_folder_dir,
            get_panels,
            check_cover_img_exists,
            show_in_folder,
            download_mpv_binary,
            path_exists,
            upsert_read_os_dir,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
