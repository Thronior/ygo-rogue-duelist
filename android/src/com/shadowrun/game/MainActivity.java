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
                out.write(bytes);out.flush();exportNotice("Image saved.");
            }catch(IOException | SecurityException e){exportNotice("Could not save the image. Please try again.");}
        },"Deck-image-export").start();
    }
    @Override protected void onDestroy(){synchronized(this){pendingDeckImage=null;}if(web!=null){web.removeJavascriptInterface("ShadowNative");web.stopLoading();web.destroy();web=null;}super.onDestroy();}

    private static final String HOST = "appassets.androidplatform.net";
    private static boolean bundled(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getUserInfo()==null && (uri.getPort()==-1 || uri.getPort()==443);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        UpdateCleanupReceiver.clearInstalled(this);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        web = new WebView(this); setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(false);
        s.setGeolocationEnabled(false); s.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new SaveStore(), "ShadowNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest r) { if (r.isForMainFrame() && bundled(r.getUrl())) return false;
                if (r.isForMainFrame() && "https".equals(r.getUrl().getScheme()) && "discord.gg".equals(r.getUrl().getHost())) {
                    try { startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, r.getUrl())); } catch (android.content.ActivityNotFoundException ignored) {}
                }
                return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView w, WebResourceRequest r) {
                Uri uri=r.getUrl(); String path=uri.getPath();
                try {
                    if (!HOST.equals(uri.getHost()) && "https".equals(uri.getScheme())) return null;
                    if (!bundled(uri) || path==null || path.contains("..") || path.contains("\\")) throw new IOException("Blocked");
                    path=path.substring(1); if(path.isEmpty()) path="index.html";
                    String ext=path.substring(path.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
                    String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    if(ext.equals("js") || ext.equals("mjs")) mime="text/javascript";
                    if(ext.equals("wasm")) mime="application/wasm";
                    if(ext.equals("m4a")) mime="audio/mp4";
                    if(ext.equals("json")) mime="application/json";
                    if(mime==null) mime="application/octet-stream";
                    Map<String,String> headers=new HashMap<>();
                    headers.put("X-Content-Type-Options","nosniff");headers.put("Referrer-Policy","no-referrer");
                    if(ext.equals("html"))headers.put("Content-Security-Policy","frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open("web/"+path));
                } catch(IOException e) { return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0])); }
            }
        });
        web.loadUrl("https://"+HOST+"/index.html");
    }
    private static byte[] png(String base64) {
        if(base64==null || base64.length()>16000000)return null;
        final byte[] bytes;
        try{bytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);}catch(IllegalArgumentException e){return null;}
        return bytes.length<8 || bytes[0]!=(byte)137 || bytes[1]!=80 || bytes[2]!=78 || bytes[3]!=71 ? null : bytes;
    }
    public final class SaveStore {
        /** Writes the PNG where ShareImageProvider serves it; only the latest image is kept. */
        private Uri shareableImage(String name,String base64) {
            final byte[] bytes=png(base64);
            if(bytes==null)return null;
            final String base=(name==null?"Image":name.replaceAll("[^a-zA-Z0-9 _.()-]","_"));
            final String filename=base.substring(0,Math.min(90,base.length()))+".png";
            final File folder=ShareImageProvider.directory(MainActivity.this);
            if(!folder.isDirectory() && !folder.mkdirs())return null;
            File[] old=folder.listFiles();
            if(old!=null)for(File f:old)f.delete();
            try(FileOutputStream out=new FileOutputStream(new File(folder,filename))){out.write(bytes);}catch(IOException e){return null;}
            return ShareImageProvider.uri(filename);
        }

        /** Puts the image on the clipboard, since the WebView cannot copy images itself. */
        @JavascriptInterface public boolean copyImage(String name,String base64) {
            final Uri uri=shareableImage(name,base64);
            if(uri==null)return false;
            runOnUiThread(() -> {
                try{
                    android.content.ClipData clip=android.content.ClipData.newUri(getContentResolver(),"Run card",uri);
                    ((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(clip);
                }catch(RuntimeException e){exportNotice("Could not copy the image. Please try again.");}
            });
            return true;
        }

        /** Older web builds call this: copy, then open the share sheet. */
        @JavascriptInterface public boolean shareImage(String name,String base64) {
            final Uri uri=shareableImage(name,base64);
            if(uri==null)return false;
            runOnUiThread(() -> {
                try{
                    android.content.ClipData clip=android.content.ClipData.newUri(getContentResolver(),"Run card",uri);
                    ((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(clip);
                    android.content.Intent send=new android.content.Intent(android.content.Intent.ACTION_SEND).setType("image/png").putExtra(android.content.Intent.EXTRA_STREAM,uri).addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    send.setClipData(clip);
                    startActivity(android.content.Intent.createChooser(send,"Share image"));
                }catch(RuntimeException e){exportNotice("Could not share the image. Please try again.");}
            });
            return true;
        }

        @JavascriptInterface public boolean saveDeckImage(String name,String base64) {
            final byte[] bytes=png(base64);
            if(bytes==null)return false;
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
