; MDPad Inno Setup 7 installer script (per-user by default, no admin required, clean uninstall).
; Follows RE:Notepad's Windows 10/11 registration pattern so MDPad appears in
; "Open with" and "Settings -> Apps -> Default apps" without intrusive AV-triggering hooks.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{8E9F4C2A-6D3B-4B18-A7F1-5C9E2B4D108A}
AppName=MDPad
AppVersion={#AppVersion}
AppVerName=MDPad {#AppVersion}
AppPublisher=MDPad Contributors
DefaultDirName={autopf}\MDPad
DefaultGroupName=MDPad
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=MDPad-{#AppVersion}-setup
SetupIconFile=..\assets\MDPad.ico
UninstallDisplayIcon={app}\MDPad.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ChangesAssociations=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "contextmenu"; Description: "Add ""Edit with MDPad"" to file right-click menu"; GroupDescription: "Windows integration:"; Flags: unchecked

[Files]
Source: "..\target\release\MDPad.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\MDPad"; Filename: "{app}\MDPad.exe"; AppUserModelID: "MDPad.Editor"
Name: "{autodesktop}\MDPad"; Filename: "{app}\MDPad.exe"; AppUserModelID: "MDPad.Editor"; Tasks: desktopicon

[Registry]
; App Paths (allows launching "MDPad" from Run / Start)
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\App Paths\MDPad.exe"; ValueType: string; ValueName: ""; ValueData: "{app}\MDPad.exe"; Flags: uninsdeletekey

; ProgID for MDPad text and Markdown documents
Root: HKA; Subkey: "Software\Classes\MDPad.txt"; ValueType: string; ValueName: ""; ValueData: "MDPad Document"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\MDPad.txt"; ValueType: string; ValueName: "AppUserModelID"; ValueData: "MDPad.Editor"
Root: HKA; Subkey: "Software\Classes\MDPad.txt\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\MDPad.exe,0"
Root: HKA; Subkey: "Software\Classes\MDPad.txt\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""

; Applications registration ("Open with")
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe"; ValueType: string; ValueName: "FriendlyAppName"; ValueData: "MDPad"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".md"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".markdown"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".txt"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".log"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".ini"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".cfg"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".conf"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".csv"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".tsv"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".json"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".jsonl"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".ndjson"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".xml"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".yaml"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".yml"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".toml"; ValueData: ""

; RegisteredApplications for Windows 10/11 "Settings -> Apps -> Default apps"
Root: HKA; Subkey: "Software\MDPad\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "MDPad"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\MDPad\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "Native Windows Notepad & Markdown editor (pure Rust + Win32)"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".md"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".markdown"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".txt"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".log"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".ini"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".cfg"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".conf"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".csv"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".tsv"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".json"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".jsonl"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".ndjson"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".xml"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".yaml"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".yml"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".toml"; ValueData: "MDPad.txt"
Root: HKA; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "MDPad"; ValueData: "Software\MDPad\Capabilities"; Flags: uninsdeletevalue

; OpenWithProgids so MDPad shows up in right-click -> Open with
Root: HKA; Subkey: "Software\Classes\.md\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.markdown\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.txt\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.log\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.json\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.ini\OpenWithProgids"; ValueType: string; ValueName: "MDPad.txt"; ValueData: ""; Flags: uninsdeletevalue

; Optional right-click context menu ("Edit with MDPad")
Root: HKA; Subkey: "Software\Classes\*\shell\MDPad"; ValueType: string; ValueName: ""; ValueData: "Edit with MDPad"; Tasks: contextmenu; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\*\shell\MDPad"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\MDPad.exe"; Tasks: contextmenu
Root: HKA; Subkey: "Software\Classes\*\shell\MDPad\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""; Tasks: contextmenu

[Run]
Filename: "{app}\MDPad.exe"; Description: "{cm:LaunchProgram,MDPad}"; Flags: nowait postinstall skipifsilent
