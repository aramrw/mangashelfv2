use std::process;

use sysinfo::{get_current_pid, System};
use tauri::{
    command,
    menu::{Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    App, AppHandle, Manager, WebviewWindow,
};

pub fn init_tray(app: &App) -> Result<(), tauri::Error> {
    let toggle_win = MenuItem::with_id(app, "toggle", "Toggle", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_win, &quit_i])?;

    let tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .build(app)?;

    tray.on_menu_event(|app: &AppHandle, event: MenuEvent| {
        if let Err(e) = handle_menu_event(app, event) {
            eprintln!("Error handling menu event: {:?}", e);
        }
    });

    Ok(())
}
fn handle_menu_event(app: &AppHandle, event: MenuEvent) -> Result<(), tauri::Error> {
    match event.id.as_ref() {
        "toggle" => handle_toggle_window(app.clone())?,
        "quit" => {
            app.cleanup_before_exit();
            process::exit(0);
        }
        _ => {
            println!("menu item {:?} not handled", event.id);
        }
    }
    Ok(())
}

fn handle_toggle_window(handle: AppHandle) -> Result<(), tauri::Error> {
    if let Some(window) = handle.get_webview_window("main") {
        if window.is_visible()? {
            window.hide()?;
            return Ok(());
        }
        window.center()?;
        window.show()?;
        window.set_focus()?;
    } else {
        build_window(handle.clone(), None)?;
    }

    Ok(())
}

#[command]
pub fn build_window(handle: AppHandle, url: Option<&str>) -> Result<WebviewWindow, tauri::Error> {
    let url = url.unwrap_or("index.html");

    let window =
        tauri::WebviewWindowBuilder::new(&handle, "main", tauri::WebviewUrl::App(url.into()))
            .title("mpvshelf")
            .inner_size(800.0, 600.0)
            .center()
            .visible(true)
            .build()?;

    Ok(window)
}

pub fn kill_dup_process() {
    let mut sys = System::new_all();
    sys.refresh_all();

    for (pid, proc) in sys.processes() {
        if proc.name().to_string_lossy().starts_with("mangashelf") {
            if let Ok(cpid) = get_current_pid() {
                if cpid != *pid {
                    proc.kill();
                }
            }
        }
    }
}
