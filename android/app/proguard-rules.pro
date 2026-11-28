# Keep JavaScriptInterface methods for MDPad Android SAF bridge
-keepclassmembers class com.marcorazzano.mdpad.MainActivity$MDPadAndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
