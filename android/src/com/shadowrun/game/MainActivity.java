package com.shadowrun.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.net.Uri;
import android.util.AtomicFile;
import android.view.View;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Offline game container. Only bundled HTTPS-origin assets can access save storage. */
public final class MainActivity extends Activity {
    private WebView web;
    private static final int SAVE_DECK_IMAGE = 4102;
    private byte[] pendingDeckImage;
    private void exportNotice(String text) { runOnUiThread(() -> android.widget.Toast.makeText(this,text,android.widget.Toast.LENGTH_LONG).show()); }
    @Override protected void onActivityResult(int request,int result,android.content.Intent data) {
        super.onActivityResult(request,result,data);
        if(request!=SAVE_DECK_IMAGE)return;
        final byte[] bytes;
        synchronized(this){bytes=pendingDeckImage;pendingDeckImage=null;}
        if(result!=RESULT_OK || data==null || data.getData()==null || bytes==null)return;
        final Uri uri=data.getData();
        new Thread(() -> {
            try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")) {
                if(out==null)throw new IOException("No output stream");
                out.write(bytes);out.flush();exportNotice("Deck image saved.");
            }catch(IOException | SecurityException e){exportNotice("Could not save the image. Please try again.");}
        },"Deck-image-export").start();
    }
    @Override protected void onDestroy(){synchronized(this){pendingDeckImage=null;}super.onDestroy();}

    private static final String HOST = "appassets.androidplatform.net";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        UpdateCleanupReceiver.clearInstalled(this);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        web = new WebView(this); setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new SaveStore(), "ShadowNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest r) { if (HOST.equals(r.getUrl().getHost())) return false;
                if (r.isForMainFrame() && "https".equals(r.getUrl().getScheme()) && "discord.gg".equals(r.getUrl().getHost())) {
                    try { startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, r.getUrl())); } catch (android.content.ActivityNotFoundException ignored) {}
                }
                return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView w, WebResourceRequest r) {
                Uri uri=r.getUrl(); String path=uri.getPath();
                try {
                    if (!HOST.equals(uri.getHost()) && "https".equals(uri.getScheme())) return null;
                    if (!HOST.equals(uri.getHost()) || path==null || path.contains("..")) throw new IOException("Blocked");
                    path=path.substring(1); if(path.isEmpty()) path="index.html";
                    String ext=path.substring(path.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
                    String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    if(ext.equals("js") || ext.equals("mjs")) mime="text/javascript";
                    if(ext.equals("wasm")) mime="application/wasm";
                    if(ext.equals("json")) mime="application/json";
                    if(mime==null) mime="application/octet-stream";
                    return new WebResourceResponse(mime,"UTF-8",getAssets().open("web/"+path));
                } catch(IOException e) { return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0])); }
            }
        });
        web.loadUrl("https://"+HOST+"/index.html");
    }
    public final class SaveStore {
        @JavascriptInterface public boolean saveDeckImage(String name,String base64) {
            if(base64==null || base64.length()>16000000)return false;
            final byte[] bytes;
            try{bytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);}catch(IllegalArgumentException e){return false;}
            if(bytes.length<8 || bytes[0]!=(byte)137 || bytes[1]!=80 || bytes[2]!=78 || bytes[3]!=71)return false;
            synchronized(MainActivity.this){if(pendingDeckImage!=null)return false;pendingDeckImage=bytes;}
            final String filename=(name==null?"Deck.png":name.replaceAll("[^a-zA-Z0-9 _.()-]","_")).substring(0,Math.min(100,name==null?8:name.length()));
            runOnUiThread(() -> {
                try{
                    android.content.Intent intent=new android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);intent.setType("image/png");
                    intent.putExtra(android.content.Intent.EXTRA_TITLE,filename);startActivityForResult(intent,SAVE_DECK_IMAGE);
                }catch(android.content.ActivityNotFoundException | SecurityException e){synchronized(MainActivity.this){pendingDeckImage=null;}exportNotice("No app is available to save this image.");}
            });
            return true;
        }

        @JavascriptInterface public void openUpdate() {
            runOnUiThread(() -> startActivity(new android.content.Intent(MainActivity.this, UpdateActivity.class)));
        }

        private final AtomicFile file = new AtomicFile(new File(getFilesDir(), "campaign.json"));
        @JavascriptInterface public synchronized String load() {
            try { return new String(file.readFully(), StandardCharsets.UTF_8); } catch(IOException e) { return "{}"; }
        }
        @JavascriptInterface public synchronized boolean store(String data) {
            if(data==null || data.length()>16000000) return false;
            FileOutputStream out=null;
            try { out=file.startWrite(); out.write(data.getBytes(StandardCharsets.UTF_8)); file.finishWrite(out); return true; }
            catch(IOException e) { if(out!=null)file.failWrite(out); return false; }
        }
    }
    @Override public void onBackPressed() { web.evaluateJavascript("window.androidBack && window.androidBack()",null); }
    @Override protected void onPause() { web.evaluateJavascript("window.suspendAudio && window.suspendAudio()",null); web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if(web!=null){web.onResume();web.evaluateJavascript("window.resumeAudio && window.resumeAudio()",null);} }
}
