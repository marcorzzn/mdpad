package com.marcorazzano.mdpad

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.documentfile.provider.DocumentFile
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * MDPad for Android — Author: Marco Razzano (MIT License)
 *
 * Loads the complete offline MDPad web bundle via WebViewAssetLoader and bridges
 * Android Storage Access Framework (SAF) + Intent Filters so MDPad works as the
 * default .md editor with full MarkItDown offline conversion and folder Post-its.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingIntentPayloadJson: String? = null
    private var pageLoaded = false

    private var pendingOpenFileRequestId: String? = null
    private var pendingOpenFolderRequestId: String? = null
    private var pendingCreateFileRequestId: String? = null
    private var pendingCreateFileBase64: String? = null
    private var pendingCreateFileMime: String = "text/markdown"

    private val openDocumentLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val reqId = pendingOpenFileRequestId ?: return@registerForActivityResult
            pendingOpenFileRequestId = null
            if (uri == null) {
                resolveJs(reqId, "null")
                return@registerForActivityResult
            }
            tryPersistUriPermission(uri, write = true)
            try {
                val payload = readUriAsJsonPayload(uri)
                resolveJs(reqId, payload.toString())
            } catch (e: Exception) {
                rejectJs(reqId, e.message ?: "Impossibile leggere il file selezionato.")
            }
        }

    private val createDocumentLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val reqId = pendingCreateFileRequestId ?: return@registerForActivityResult
            val b64 = pendingCreateFileBase64
            pendingCreateFileRequestId = null
            pendingCreateFileBase64 = null
            val uri = result.data?.data
            if (result.resultCode != RESULT_OK || uri == null || b64 == null) {
                resolveJs(reqId, "null")
                return@registerForActivityResult
            }
            tryPersistUriPermission(uri, write = true)
            try {
                val bytes = Base64.decode(b64, Base64.DEFAULT)
                contentResolver.openOutputStream(uri, "wt")?.use { out ->
                    out.write(bytes)
                    out.flush()
                } ?: throw IllegalStateException("Stream di scrittura non disponibile.")
                val payload = JSONObject()
                    .put("name", queryDisplayName(uri) ?: "documento.md")
                    .put("uri", uri.toString())
                resolveJs(reqId, payload.toString())
            } catch (e: Exception) {
                rejectJs(reqId, e.message ?: "Errore salvataggio documento.")
            }
        }

    private val openFolderLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { treeUri ->
            val reqId = pendingOpenFolderRequestId ?: return@registerForActivityResult
            pendingOpenFolderRequestId = null
            if (treeUri == null) {
                resolveJs(reqId, "null")
                return@registerForActivityResult
            }
            tryPersistUriPermission(treeUri, write = true)
            Thread {
                try {
                    val rootDoc = DocumentFile.fromTreeUri(this, treeUri)
                        ?: throw IllegalStateException("Impossibile aprire la cartella.")
                    val folderName = rootDoc.name ?: "Cartella_Android"
                    val entries = JSONArray()
                    walkDocumentTree(rootDoc, "", entries, 0)
                    val payload = JSONObject()
                        .put("folderName", folderName)
                        .put("treeUri", treeUri.toString())
                        .put("entries", entries)
                    resolveJs(reqId, payload.toString())
                } catch (e: Exception) {
                    rejectJs(reqId, e.message ?: "Errore scansione cartella Android.")
                }
            }.start()
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleIncomingIntent(intent)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        webView.addJavascriptInterface(MDPadAndroidBridge(), "MDPadAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                pageLoaded = true
                deliverPendingIntentIfAny()
            }
        }

        webView.loadUrl("https://appassets.androidplatform.net/index.html")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
        if (pageLoaded) {
            deliverPendingIntentIfAny()
        }
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return
        when (action) {
            Intent.ACTION_VIEW, Intent.ACTION_EDIT -> {
                val uri = intent.data ?: return
                tryPersistUriPermission(uri, write = true)
                try {
                    pendingIntentPayloadJson = readUriAsJsonPayload(uri).toString()
                } catch (_: Exception) {
                    // Ignore unreadable external intent
                }
            }
            Intent.ACTION_SEND -> {
                val streamUri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_STREAM)
                }
                if (streamUri != null) {
                    try {
                        pendingIntentPayloadJson = readUriAsJsonPayload(streamUri).toString()
                    } catch (_: Exception) {
                    }
                } else {
                    val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                    if (!sharedText.isNullOrEmpty()) {
                        val b64 = Base64.encodeToString(sharedText.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
                        pendingIntentPayloadJson = JSONObject()
                            .put("name", "Condiviso.md")
                            .put("uri", "")
                            .put("base64", b64)
                            .toString()
                    }
                }
            }
        }
    }

    private fun deliverPendingIntentIfAny() {
        val json = pendingIntentPayloadJson ?: return
        val quoted = JSONObject.quote(json)
        runOnUiThread {
            webView.evaluateJavascript(
                "if (window.__mdpadAndroidOnIntentFile) { window.__mdpadAndroidOnIntentFile($quoted); }",
                null
            )
        }
    }

    private fun tryPersistUriPermission(uri: Uri, write: Boolean) {
        try {
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                (if (write) Intent.FLAG_GRANT_WRITE_URI_PERMISSION else 0)
            contentResolver.takePersistableUriPermission(uri, flags)
        } catch (_: SecurityException) {
            // Some content providers only grant transient permissions
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) return cursor.getString(idx)
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/')
    }

    private fun readUriBytes(uri: Uri): ByteArray {
        val input = contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Impossibile aprire lo stream del file.")
        input.use { stream ->
            val buffer = ByteArrayOutputStream()
            val chunk = ByteArray(16384)
            while (true) {
                val read = stream.read(chunk)
                if (read <= 0) break
                buffer.write(chunk, 0, read)
            }
            return buffer.toByteArray()
        }
    }

    private fun readUriAsJsonPayload(uri: Uri): JSONObject {
        val bytes = readUriBytes(uri)
        val name = queryDisplayName(uri) ?: "documento.md"
        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return JSONObject()
            .put("name", name)
            .put("uri", uri.toString())
            .put("base64", b64)
    }

    private fun walkDocumentTree(
        dir: DocumentFile,
        prefix: String,
        out: JSONArray,
        depth: Int
    ) {
        if (depth > 4 || out.length() >= 400) return
        val children = dir.listFiles()
        for (child in children) {
            if (out.length() >= 400) break
            val name = child.name ?: continue
            if (name.startsWith(".") && name != ".directory") continue
            val rel = if (prefix.isEmpty()) name else "$prefix/$name"
            val isDir = child.isDirectory
            out.put(
                JSONObject()
                    .put("relativePath", rel)
                    .put("name", name)
                    .put("kind", if (isDir) "dir" else "file")
                    .put("uri", child.uri.toString())
            )
            if (isDir) {
                walkDocumentTree(child, rel, out, depth + 1)
            }
        }
    }

    private fun resolveJs(requestId: String, payloadJson: String) {
        val reqQuoted = JSONObject.quote(requestId)
        val payloadQuoted = JSONObject.quote(payloadJson)
        runOnUiThread {
            webView.evaluateJavascript(
                "window.__mdpadAndroidResolve && window.__mdpadAndroidResolve($reqQuoted, $payloadQuoted);",
                null
            )
        }
    }

    private fun rejectJs(requestId: String, message: String) {
        val reqQuoted = JSONObject.quote(requestId)
        val msgQuoted = JSONObject.quote(message)
        runOnUiThread {
            webView.evaluateJavascript(
                "window.__mdpadAndroidReject && window.__mdpadAndroidReject($reqQuoted, $msgQuoted);",
                null
            )
        }
    }

    inner class MDPadAndroidBridge {

        @JavascriptInterface
        fun openFile(requestId: String) {
            runOnUiThread {
                pendingOpenFileRequestId = requestId
                openDocumentLauncher.launch(arrayOf("*/*"))
            }
        }

        @JavascriptInterface
        fun saveFile(
            requestId: String,
            uriOrEmpty: String,
            suggestedName: String,
            base64: String,
            mimeType: String
        ) {
            if (uriOrEmpty.isNotBlank()) {
                Thread {
                    try {
                        val uri = Uri.parse(uriOrEmpty)
                        val bytes = Base64.decode(base64, Base64.DEFAULT)
                        contentResolver.openOutputStream(uri, "wt")?.use { out ->
                            out.write(bytes)
                            out.flush()
                        } ?: throw IllegalStateException("Scrittura non consentita su questo URI.")
                        val payload = JSONObject()
                            .put("name", queryDisplayName(uri) ?: suggestedName)
                            .put("uri", uri.toString())
                        resolveJs(requestId, payload.toString())
                    } catch (_: Exception) {
                        // Fallback to native Android "Save As" dialog if original URI is read-only
                        launchCreateDocument(requestId, suggestedName, base64, mimeType)
                    }
                }.start()
            } else {
                launchCreateDocument(requestId, suggestedName, base64, mimeType)
            }
        }

        private fun launchCreateDocument(
            requestId: String,
            suggestedName: String,
            base64: String,
            mimeType: String
        ) {
            runOnUiThread {
                pendingCreateFileRequestId = requestId
                pendingCreateFileBase64 = base64
                pendingCreateFileMime = mimeType.substringBefore(';').ifBlank { "text/markdown" }
                val createIntent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = pendingCreateFileMime
                    putExtra(Intent.EXTRA_TITLE, suggestedName)
                }
                createDocumentLauncher.launch(createIntent)
            }
        }

        @JavascriptInterface
        fun openFolder(requestId: String) {
            runOnUiThread {
                pendingOpenFolderRequestId = requestId
                openFolderLauncher.launch(null)
            }
        }

        @JavascriptInterface
        fun readDocumentUri(requestId: String, uriStr: String) {
            Thread {
                try {
                    val uri = Uri.parse(uriStr)
                    val bytes = readUriBytes(uri)
                    val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    resolveJs(requestId, JSONObject().put("base64", b64).toString())
                } catch (e: Exception) {
                    rejectJs(requestId, e.message ?: "Errore lettura file Android.")
                }
            }.start()
        }

        @JavascriptInterface
        fun writeFileInFolder(
            requestId: String,
            treeUriStr: String,
            filename: String,
            base64: String,
            mimeType: String
        ) {
            Thread {
                try {
                    val treeUri = Uri.parse(treeUriStr)
                    val rootDoc = DocumentFile.fromTreeUri(this@MainActivity, treeUri)
                        ?: throw IllegalStateException("Cartella Android non accessibile.")
                    val safeName = filename.substringAfterLast('/').substringAfterLast('\\')
                    val existing = rootDoc.findFile(safeName)
                    val target = existing ?: rootDoc.createFile(
                        mimeType.substringBefore(';').ifBlank { "text/markdown" },
                        safeName
                    ) ?: throw IllegalStateException("Impossibile creare $safeName nella cartella.")

                    val bytes = Base64.decode(base64, Base64.DEFAULT)
                    contentResolver.openOutputStream(target.uri, "wt")?.use { out ->
                        out.write(bytes)
                        out.flush()
                    } ?: throw IllegalStateException("Impossibile scrivere in $safeName.")

                    resolveJs(requestId, JSONObject().put("uri", target.uri.toString()).toString())
                } catch (e: Exception) {
                    rejectJs(requestId, e.message ?: "Errore scrittura file nella cartella Android.")
                }
            }.start()
        }

        @JavascriptInterface
        fun getPendingIntentFile(): String {
            val payload = pendingIntentPayloadJson ?: ""
            pendingIntentPayloadJson = null
            return payload
        }
    }
}
