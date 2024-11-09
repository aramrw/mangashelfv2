use chrono::Local;
use futures_util::{StreamExt, TryStreamExt};
use reqwest::Client;
use std::io::Write;
use std::mem::take;
use std::{env, fs::File};
use tauri::{command, AppHandle, Emitter, Manager, Window};
use tauri_plugin_os::platform;

use crate::error::HttpClientError;

pub fn get_date_time() -> (String, String) {
    let local_t = Local::now();
    let date_t_string = local_t.format("%Y-%m-%d %H:%M").to_string();

    let mut date_vec: Vec<String> = date_t_string
        .split_whitespace()
        .map(|x| x.to_owned())
        .collect();

    if date_vec.len() == 2 {
        let mut time = take(&mut date_vec[1]);
        if let Some((h, m)) = time.split_once(":") {
            if let Ok(int_h) = h.parse::<u8>() {
                time = format!(
                    "{:02}:{:02}{}",
                    int_h % 12,
                    m,
                    if int_h >= 12 { "pm" } else { "am" }
                );
            }
        }

        return (take(&mut date_vec[0]), time);
    }

    (String::new(), String::new())
}


