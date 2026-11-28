// MDPad Desktop — Native Cross-Platform Rust + OS WebView2/WKWebView/WebKitGTK shell
// Author: Marco Razzano (MIT License)
// Renders the complete MDPad UI offline from embedded assets with native OS filesystem access.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Serialize)]
struct PickedFilePayload {
    name: String,
    path: String,
    base64: String,
}

#[derive(Serialize)]
struct SavedFilePayload {
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderEntryPayload {
    relative_path: String,
    name: String,
    kind: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderScanPayload {
    folder_name: String,
    root_path: String,
    entries: Vec<FolderEntryPayload>,
}

#[derive(Deserialize)]
struct WriteFileEntry {
    filename: String,
    base64: String,
}

fn read_file_payload(path: &Path) -> Result<PickedFilePayload, String> {
    let bytes = fs::read(path).map_err(|e| format!("Impossibile leggere il file: {e}"))?;
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("documento.md")
        .to_string();
    Ok(PickedFilePayload {
        name,
        path: path.to_string_lossy().to_string(),
        base64: BASE64.encode(&bytes),
    })
}

#[tauri::command]
fn pick_open_file() -> Result<Option<PickedFilePayload>, String> {
    let picked = rfd::FileDialog::new()
        .add_filter(
            "Markdown, testo e documenti",
            &[
                "md", "markdown", "txt", "log", "json", "csv", "tsv", "html", "htm", "docx",
                "xlsx", "xls", "pptx", "pdf", "epub", "ipynb", "rss", "xml", "zip",
            ],
        )
        .add_filter("Tutti i file", &["*"])
        .pick_file();

    match picked {
        Some(path) => read_file_payload(&path).map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
fn save_file(
    path: Option<String>,
    suggested_name: String,
    base64: String,
) -> Result<Option<SavedFilePayload>, String> {
    let bytes = BASE64
        .decode(base64.as_bytes())
        .map_err(|e| format!("Codifica base64 non valida: {e}"))?;

    let target: Option<PathBuf> = match path {
        Some(existing) if !existing.trim().is_empty() => Some(PathBuf::from(existing)),
        _ => rfd::FileDialog::new()
            .set_file_name(&suggested_name)
            .add_filter("Documento Markdown", &["md", "markdown"])
            .add_filter("Documento di testo", &["txt", "log", "json"])
            .add_filter("Tutti i file", &["*"])
            .save_file(),
    };

    let Some(dest) = target else {
        return Ok(None);
    };

    fs::write(&dest, bytes).map_err(|e| format!("Impossibile salvare il file: {e}"))?;
    let name = dest
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(&suggested_name)
        .to_string();

    Ok(Some(SavedFilePayload {
        name,
        path: dest.to_string_lossy().to_string(),
    }))
}

#[tauri::command]
fn pick_and_scan_folder() -> Result<Option<FolderScanPayload>, String> {
    let Some(root) = rfd::FileDialog::new().pick_folder() else {
        return Ok(None);
    };

    let folder_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Cartella")
        .to_string();

    let mut entries: Vec<FolderEntryPayload> = Vec::new();
    for entry in WalkDir::new(&root)
        .max_depth(4)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entries.len() >= 450 {
            break;
        }
        let path = entry.path();
        if path == root {
            continue;
        }
        let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
            continue;
        };
        if (name.starts_with('.') && name != ".directory")
            || name == "node_modules"
            || name == "target"
        {
            continue;
        }
        let Ok(rel) = path.strip_prefix(&root) else {
            continue;
        };
        let rel_str = rel.to_string_lossy().replace('\\', "/");
        entries.push(FolderEntryPayload {
            relative_path: rel_str,
            name: name.to_string(),
            kind: if entry.file_type().is_dir() {
                "dir".to_string()
            } else {
                "file".to_string()
            },
            path: path.to_string_lossy().to_string(),
        });
    }

    Ok(Some(FolderScanPayload {
        folder_name,
        root_path: root.to_string_lossy().to_string(),
        entries,
    }))
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Errore lettura file: {e}"))?;
    Ok(BASE64.encode(&bytes))
}

#[tauri::command]
fn write_files_in_folder(folder_path: String, files: Vec<WriteFileEntry>) -> Result<(), String> {
    let base = PathBuf::from(&folder_path);
    if !base.is_dir() {
        return Err("La cartella di destinazione non esiste.".to_string());
    }
    for file in files {
        let safe_name = Path::new(&file.filename)
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or_else(|| "Nome file non valido.".to_string())?;
        let bytes = BASE64
            .decode(file.base64.as_bytes())
            .map_err(|e| format!("Base64 non valido: {e}"))?;
        let dest = base.join(safe_name);
        fs::write(&dest, bytes)
            .map_err(|e| format!("Impossibile scrivere {safe_name}: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn get_launch_files() -> Vec<PickedFilePayload> {
    let mut opened = Vec::new();
    for arg in std::env::args().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let path = PathBuf::from(&arg);
        if path.is_file() {
            if let Ok(payload) = read_file_payload(&path) {
                opened.push(payload);
            }
        }
    }
    opened
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_open_file,
            save_file,
            pick_and_scan_folder,
            read_file_bytes,
            write_files_in_folder,
            get_launch_files
        ])
        .run(tauri::generate_context!())
        .expect("Errore avvio applicazione MDPad");
}
