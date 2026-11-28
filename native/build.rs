// Embed the application manifest (Common Controls 6 + PerMonitorV2 DPI + asInvoker),
// the multi-resolution icon and complete Windows VERSIONINFO metadata.
// Proper manifest + VERSIONINFO metadata are essential for clean Windows shell
// integration, dark theming, edit-control extensions, and low AV false-positive rates.
use std::path::Path;

fn main() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let manifest = root.join("MDPad.manifest");
    let icon = root.join("assets").join("MDPad.ico");
    println!("cargo:rerun-if-changed=MDPad.manifest");
    println!("cargo:rerun-if-changed=assets/MDPad.ico");
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() != Ok("msvc") {
        return;
    }
    println!("cargo:rustc-link-arg-bins=/MANIFEST:EMBED");
    println!("cargo:rustc-link-arg-bins=/MANIFESTINPUT:{}", manifest.display());

    let version = env!("CARGO_PKG_VERSION");
    let mut parts: Vec<u16> = version.split('.').map(|p| p.parse().unwrap_or(0)).collect();
    parts.resize(4, 0);
    let numeric = parts.iter().map(u16::to_string).collect::<Vec<_>>().join(",");
    let rc = format!(
        r#"#pragma code_page(65001)
1 ICON "{icon}"
1 VERSIONINFO
FILEVERSION {numeric}
PRODUCTVERSION {numeric}
FILEOS 0x40004
FILETYPE 0x1
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904B0"
    BEGIN
      VALUE "CompanyName", "MDPad Contributors"
      VALUE "FileDescription", "MDPad - Native Windows Markdown Notepad"
      VALUE "FileVersion", "{version}"
      VALUE "InternalName", "MDPad"
      VALUE "LegalCopyright", "MIT License - Built on RE:Notepad architecture"
      VALUE "OriginalFilename", "MDPad.exe"
      VALUE "ProductName", "MDPad"
      VALUE "ProductVersion", "{version}"
      VALUE "Comments", "Native Rust + Win32 Notepad & Markdown editor with zero telemetry."
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"#,
        icon = icon.display().to_string().replace('\\', "\\\\"),
    );
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("MDPad.rc");
    std::fs::write(&out, rc).unwrap();
    embed_resource::compile(&out, embed_resource::NONE).manifest_optional().unwrap();
}
