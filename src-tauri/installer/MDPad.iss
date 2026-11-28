; MDPad Inno Setup 7 installer script (per-user by default, no admin required, clean uninstall).
; Author: Marco Razzano — MIT License
; Registers MDPad in Windows 10/11 "Open with" and "Default apps" for .md, .markdown, .txt, .json.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{8E9F4C2A-6D3B-4B18-A7F1-5C9E2B4D108A}
AppName=MDPad
AppVersion={#AppVersion}
AppVerName=MDPad {#AppVersion}
AppPublisher=Marco Razzano
DefaultDirName={autopf}\MDPad
DefaultGroupName=MDPad
DisableProgramGroupPage=yes
LicenseFile=..\..\LICENSE
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=MDPad-{#AppVersion}-setup
SetupIconFile=..\icons\icon.ico
UninstallDisplayIcon={app}\MDPad.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ChangesAssociations=yes

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "contextmenu"; Description: "Aggiungi ""Apri con MDPad"" al menu contestuale dei file"; GroupDescription: "Integrazione Windows:"; Flags: unchecked

[Files]
Source: "..\target\release\MDPad.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\MDPad"; Filename: "{app}\MDPad.exe"; AppUserModelID: "com.marcorazzano.mdpad"
Name: "{autodesktop}\MDPad"; Filename: "{app}\MDPad.exe"; AppUserModelID: "com.marcorazzano.mdpad"; Tasks: desktopicon

[Registry]
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\App Paths\MDPad.exe"; ValueType: string; ValueName: ""; ValueData: "{app}\MDPad.exe"; Flags: uninsdeletekey

Root: HKA; Subkey: "Software\Classes\MDPad.md"; ValueType: string; ValueName: ""; ValueData: "Documento Markdown (MDPad)"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\MDPad.md"; ValueType: string; ValueName: "AppUserModelID"; ValueData: "com.marcorazzano.mdpad"
Root: HKA; Subkey: "Software\Classes\MDPad.md\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\MDPad.exe,0"
Root: HKA; Subkey: "Software\Classes\MDPad.md\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""

Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe"; ValueType: string; ValueName: "FriendlyAppName"; ValueData: "MDPad"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".md"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".markdown"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".txt"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".log"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\MDPad.exe\SupportedTypes"; ValueType: string; ValueName: ".json"; ValueData: ""

Root: HKA; Subkey: "Software\MDPad\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "MDPad"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\MDPad\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "MDPad di Marco Razzano — Blocco Note Markdown con MarkItDown e Post-it Cartelle"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".md"; ValueData: "MDPad.md"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".markdown"; ValueData: "MDPad.md"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".txt"; ValueData: "MDPad.md"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".log"; ValueData: "MDPad.md"
Root: HKA; Subkey: "Software\MDPad\Capabilities\FileAssociations"; ValueType: string; ValueName: ".json"; ValueData: "MDPad.md"
Root: HKA; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "MDPad"; ValueData: "Software\MDPad\Capabilities"; Flags: uninsdeletevalue

Root: HKA; Subkey: "Software\Classes\.md\OpenWithProgids"; ValueType: string; ValueName: "MDPad.md"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.markdown\OpenWithProgids"; ValueType: string; ValueName: "MDPad.md"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.txt\OpenWithProgids"; ValueType: string; ValueName: "MDPad.md"; ValueData: ""; Flags: uninsdeletevalue

Root: HKA; Subkey: "Software\Classes\*\shell\MDPad"; ValueType: string; ValueName: ""; ValueData: "Apri con MDPad"; Tasks: contextmenu; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\*\shell\MDPad"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\MDPad.exe"; Tasks: contextmenu
Root: HKA; Subkey: "Software\Classes\*\shell\MDPad\command"; ValueType: string; ValueName: ""; ValueData: """{app}\MDPad.exe"" ""%1"""; Tasks: contextmenu

[Run]
Filename: "{app}\MDPad.exe"; Description: "{cm:LaunchProgram,MDPad}"; Flags: nowait postinstall skipifsilent
