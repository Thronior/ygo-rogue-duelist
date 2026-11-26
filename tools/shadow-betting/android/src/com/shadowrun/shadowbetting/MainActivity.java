package com.shadowrun.shadowbetting;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import java.io.*;
import java.util.*;

/** Shadow Betting on its own: the standalone minigame site (tools/build_shadow_betting.py) inside a WebView.
    Everything is served from the APK under one HTTPS origin; nothing is fetched from the network.
    A separate app from the game (its own package and save). */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;

    private static boolean bundled(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0D12);
        setContentView(web);
        immersive();
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(false);
        s.setGeolocationEnabled(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest r) { return !(r.isForMainFrame() && bundled(r.getUrl())); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView w, WebResourceRequest r) {
                Uri uri = r.getUrl(); String path = uri.getPath();
                try {
                    if (!bundled(uri) || path == null || path.contains("..") || path.contains("\\")) throw new IOException("Blocked");
                    path = path.substring(1); if (path.isEmpty()) path = "index.html";
                    String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    if (ext.equals("js") || ext.equals("mjs")) mime = "text/javascript";
                    if (ext.equals("json")) mime = "application/json";
                    if (ext.equals("ttf")) mime = "font/ttf";
                    if (ext.equals("m4a")) mime = "audio/mp4";
                    if (mime == null) mime = "application/octet-stream";
                    Map<String, String> headers = new HashMap<>();
                    headers.put("X-Content-Type-Options", "nosniff");
                    headers.put("Access-Control-Allow-Origin", "https://" + HOST);
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open("site/" + path));
                } catch (IOException e) { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0])); }
            }
        });
        web.loadUrl("https://" + HOST + "/index.html");
    }

    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    // In the background the page is hidden (music stops, the game saves) and its timers pause.
    @Override protected void onPause() { if (web != null) { web.onPause(); web.pauseTimers(); } super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.resumeTimers(); web.onResume(); } }
    /** Back closes an open window (settings, stats, shop tip); with none open it leaves the app. */
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(d){d.close();return 'stay'}return 'exit'})()", value -> { if ("\"exit\"".equals(value)) finish(); });
    }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
