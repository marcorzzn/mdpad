# Certificazione Code Signing Open Source per MDPad (Marco Razzano)

Questa guida spiega come eliminare l'avviso iniziale di **Windows SmartScreen ("Autore sconosciuto")** e firmare le release ufficiali di **MDPad** (Windows e Android) trattandosi di un progetto **Open Source (licenza MIT)**.

---

## 1. Windows — Certificazione GRATUITA per Open Source con SignPath Foundation (Consigliata)

La **SignPath Foundation** offre gratuitamente certificati **Authenticode** riconosciuti da Microsoft a progetti Open Source su GitHub (usata da progetti come Notepad++, PowerShell, Python, Wireshark, ecc.).

### Requisiti richiesti da SignPath Foundation
1. Repository pubblico su GitHub con licenza Open Source approvata OSI (**MIT**, già presente in `LICENSE`).
2. Build **riproducibile / costruita interamente su GitHub Actions** (già configurata in `.github/workflows/release-build.yml`).
3. File **`SECURITY.md`** e politica di firma nel `README.md` (già presenti nel repository).

### Procedura passo-passo (gratuita)
1. Vai su **[https://signpath.org](https://signpath.org)** → **Apply for free Open Source Code Signing**.
2. Compila la candidatura indicando:
   - **Progetto**: `MDPad`
   - **Autore / Maintainer**: `Marco Razzano`
   - **Repository**: il link al tuo repository GitHub
   - **Licenza**: `MIT`
3. Dopo l'approvazione, nella dashboard SignPath crea:
   - un **Project** chiamato `MDPad` collegato al tuo repository GitHub
   - una **Signing Policy** (`release-signing`) associata al certificato gratuito della SignPath Foundation
   - un **API Token** per GitHub Actions
4. Nel tuo repository GitHub vai su **Settings → Secrets and variables → Actions** e aggiungi:
   - `SIGNPATH_ORGANIZATION_ID` (il tuo Organization ID su SignPath)
   - `SIGNPATH_API_TOKEN` (il token generato su SignPath)
5. Facoltativamente imposta anche le variabili repository (`SIGNPATH_PROJECT_SLUG=mdpad`, `SIGNPATH_SIGNING_POLICY_SLUG=release-signing`).
6. Al prossimo rilascio (tag `v1.0.0`, ecc.), GitHub Actions invierà automaticamente gli artefatti Windows a SignPath e scaricherà `MDPad-*-setup.exe` e `MDPad-*-portable.zip` **firmati con certificato trusted**.

---

## 2. Windows — Alternative a SignPath

### Opzione B: Microsoft Azure Trusted Signing (~9,99 $/mese)
- Servizio ufficiale Microsoft disponibile anche per sviluppatori individuali (verifica identità con documento).
- Firma cloud senza token USB hardware e reputazione SmartScreen immediata.

### Opzione C: Certificato `.pfx` Authenticode personale
Se disponi già di un file `.pfx`:
1. Convertilo in Base64 su PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificato.pfx")) | Set-Clipboard
   ```
2. Aggiungi nei Secrets del repository GitHub:
   - `WIN_CSC_PFX_BASE64`
   - `WIN_CSC_PASSWORD`

Il workflow `src-tauri/scripts/package-windows.ps1` lo rileva e firma automaticamente sia `MDPad.exe` sia `MDPad-*-setup.exe` con timestamp RFC 3161 DigiCert.

---

## 3. Android — Firma Release APK (`MDPad-1.0.0-android.apk`)

Su Android **non serve acquistare alcun certificato**: puoi generare gratuitamente la tua chiave di firma crittografica ufficiale (valida sia per installazione diretta APK sia per Google Play Store / F-Droid):

1. Genera il keystore una sola volta sul tuo PC (con Java `keytool`):
   ```bash
   keytool -genkeypair -v -keystore mdpad-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mdpad -dname "CN=Marco Razzano, O=MDPad, C=IT"
   ```
2. Convertilo in Base64:
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("mdpad-release.jks")) | Set-Clipboard`
   - macOS / Linux: `base64 -w 0 mdpad-release.jks`
3. Aggiungi questi 4 secret su GitHub (**Settings → Secrets and variables → Actions**):
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (es. `mdpad`)
   - `ANDROID_KEY_PASSWORD`

Alla build successiva GitHub Actions genererà automaticamente **`MDPad-1.0.0-android.apk` firmato** pronto da installare o pubblicare su **F-Droid / IzzyOnDroid / Google Play**.
