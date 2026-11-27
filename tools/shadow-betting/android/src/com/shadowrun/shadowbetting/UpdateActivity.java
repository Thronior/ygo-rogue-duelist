package com.shadowrun.shadowbetting;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import javax.net.ssl.HttpsURLConnection;

/** Download, verify and install only a newer, identically signed version of this app. */
public final class UpdateActivity extends Activity {
    /** Shadow Betting's release details: shadow-betting-manifest.json on the fixed "shadow-betting" release. */
    private static final String MANIFEST=UpdatePolicy.RELEASE+UpdatePolicy.MANIFEST;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private volatile HttpsURLConnection connection;
    private volatile File apk;
    private final UpdateDownload download=new UpdateDownload();
    private TextView status;
    private TextView english;
    private TextView transfer;
    private ProgressBar progress;
    private Button action;
    private volatile int sessionId=-1;
    private volatile boolean committed;
    private boolean awaitingPermission;
    private String version;
    private long expectedSize;
    /** Chinese players (Discord, 2026-11-21): Chinese text, errors repeated in English for reports, and GitHub mirrors first. */
    private boolean zh;
    /** Mirror prefix the release details came through; "" means GitHub directly. */
    private volatile String mirror="";

    /** An update failure with its Chinese text. Its message is the English text. */
    static final class UpdateError extends IOException {
        final String zh;
        UpdateError(String en,String zh){super(en);this.zh=zh;}
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String language=getIntent().getStringExtra("language");if(language==null)language=Locale.getDefault().getLanguage();zh="zh".equals(language);
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);
        int pad=(int)(24*getResources().getDisplayMetrics().density);panel.setPadding(pad,pad,pad,pad);panel.setBackgroundColor(Color.rgb(8,25,35));
        TextView title=new TextView(this);title.setText(say("Game Update","游戏更新"));title.setTextSize(26);title.setTextColor(Color.rgb(242,220,137));panel.addView(title);
        status=new TextView(this);status.setTextSize(17);status.setTextColor(Color.WHITE);status.setGravity(Gravity.CENTER);status.setPadding(0,pad,0,pad);panel.addView(status);
        english=new TextView(this);english.setTextSize(13);english.setTextColor(Color.rgb(150,170,180));english.setGravity(Gravity.CENTER);english.setPadding(0,0,0,pad);english.setVisibility(View.GONE);panel.addView(english);
        transfer=new TextView(this);transfer.setTextSize(14);transfer.setTextColor(Color.rgb(180,200,210));transfer.setGravity(Gravity.CENTER);panel.addView(transfer);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setIndeterminate(true);panel.addView(progress,new LinearLayout.LayoutParams(-1,pad));
        action=new Button(this);action.setText(say("Cancel","取消"));action.setOnClickListener(v->finish());panel.addView(action);setContentView(panel);
        if(getIntent().hasExtra(PackageInstaller.EXTRA_STATUS)){restoreCandidate();handleResult(getIntent());}else begin();
    }
    private String say(String en,String zh){return this.zh?zh:en;}
    private void ui(Runnable task){runOnUiThread(()->{if(!closed&&!isFinishing())task.run();});}
    private void text(String en,String zh){String message=say(en,zh);ui(()->status.setText(message));}
    private void ensureOpen() throws IOException {if(closed||Thread.currentThread().isInterrupted())throw new InterruptedIOException("Update cancelled");}
    private HttpsURLConnection open(String address) throws IOException {
        URL url=new URL(address);
        for(int redirects=0;redirects<6;redirects++){
            ensureOpen();if(!UpdatePolicy.allowed(url))throw new IOException("Unexpected download address.");
            HttpsURLConnection c=(HttpsURLConnection)url.openConnection();connection=c;c.setConnectTimeout(20000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","YGO-Rogue-Updater");
            int code=c.getResponseCode();
            if(code>=300&&code<400){String next=c.getHeaderField("Location");c.disconnect();if(next==null)throw new IOException("Download redirect is missing.");url=new URL(url,next);continue;}
            if(code!=200){c.disconnect();if(code==403||code==429)throw new UpdateError("Update service is busy. Please try again later.","更新服务繁忙，请稍后再试。");throw new IOException("Could not download the update (HTTP "+code+").");}
            return c;
        }
        throw new IOException("Too many download redirects.");
    }
    private JSONObject fetchJson(String address) throws Exception {
        HttpsURLConnection c=open(address);
        try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){ensureOpen();out.write(buf,0,n);if(out.size()>1024*1024)throw new IOException("Invalid update response.");}
            return new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
        }finally{c.disconnect();connection=null;}
    }
    /** Release details, trying each source in turn. GitHub allows 60 API calls an hour per IP without a login, which shared
     *  mobile, VPN and school networks run out of, and GitHub is slow or blocked in mainland China (Discord, 2026-11-21).
     *  The release manifest has the same details without the API limit, and public mirrors relay it where GitHub is blocked.
     *  A mirror can't swap the game: the APK must match the manifest's SHA-256 and this app's signing key. */
    private JSONObject latest() throws Exception {
        List<String> sources=new ArrayList<>();sources.add("");// "" = manifest from GitHub
        if(zh)sources.addAll(0,Arrays.asList(UpdatePolicy.MIRRORS));else sources.addAll(Arrays.asList(UpdatePolicy.MIRRORS));
        String fresh="?t="+System.currentTimeMillis();// mirrors cache "latest"; GitHub ignores the query
        for(String prefix:sources){
            try{
                JSONObject release=fromManifest(fetchJson(prefix+MANIFEST+fresh));
                mirror=prefix;return release;
            }catch(InterruptedIOException cancelled){throw cancelled;}
            catch(Exception error){ensureOpen();android.util.Log.i("GameUpdate","Release source "+(prefix.isEmpty()?"github":prefix)+" unavailable: "+error.getMessage());}
        }
        throw new UpdateError("Could not reach the update service. Please try again later, or download Shadow-Betting.apk from its GitHub release page.",
            "无法连接更新服务。请稍后再试，或从 GitHub 发布页面下载 Shadow-Betting.apk。");
    }
    /** Shapes release-manifest.json like the API's release so the same checks (UpdatePolicy, digest, signature) apply. */
    static JSONObject fromManifest(JSONObject manifest) throws JSONException {
        String tag="v"+manifest.getString("version");JSONArray assets=new JSONArray();JSONObject files=manifest.getJSONObject("files");
        for(Iterator<String> names=files.keys();names.hasNext();){
            String name=names.next();JSONObject file=files.getJSONObject(name);
            if(!name.equals(UpdatePolicy.APK))continue;
            assets.put(new JSONObject().put("name",name).put("size",file.getLong("bytes")).put("digest","sha256:"+file.getString("sha256"))
                .put("browser_download_url",UpdatePolicy.RELEASE+name));
        }
        return new JSONObject().put("tag_name",tag).put("draft",false).put("prerelease",false).put("assets",assets);
    }
    /** Downloads through the mirror the release details came from, then from GitHub itself if the mirror fails. */
    private void fetch(String url,File file,long size,String hash,UpdateDownload.Progress progress) throws IOException {
        String prefix=mirror;
        if(!prefix.isEmpty())try{download.download(prefix+url,file,size,hash,progress);return;}
            catch(IOException error){ensureOpen();android.util.Log.i("GameUpdate","Mirror download failed ("+error.getMessage()+"); using GitHub.");progress.update(0);}
        download.download(url,file,size,hash,progress);
    }
    private void begin(){
        status.setText(say("Checking for an update…","正在检查更新…"));
        worker.execute(()->{
            try{
                UpdateCleanupReceiver.clear(this);
                JSONObject release=latest();String tag=release.getString("tag_name");
                PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
                if(release.optBoolean("draft")||release.optBoolean("prerelease"))throw new UpdateError("No stable update is available.","目前没有可用的正式版更新。");
                if(!UpdatePolicy.newer(tag,installed.versionName)){ui(()->{progress.setVisibility(View.GONE);status.setText(say("You’re up to date.","已是最新版本。"));action.setText(say("Close","关闭"));});return;}
                JSONObject asset=null;JSONArray assets=release.getJSONArray("assets");for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if(UpdatePolicy.APK.equals(a.optString("name"))){asset=a;break;}}
                if(asset==null)throw new UpdateError("The Android update is not ready yet.","安卓更新尚未准备好，请稍后再试。");
                String url=asset.getString("browser_download_url"),digest=asset.optString("digest");expectedSize=asset.getLong("size");
                if(!UpdatePolicy.asset(url,tag,digest,expectedSize))throw new UpdateError("The update details could not be verified.","无法验证更新信息。");
                version=tag.replaceFirst("^v", "");
                if(getCacheDir().getUsableSpace()<expectedSize*2+32*1024*1024)throw new UpdateError("Not enough free space to update. Free some storage and try again.","存储空间不足，请清理空间后重试。");
                apk=File.createTempFile("game-update-", ".apk",getCacheDir());
                ui(()->progress.setIndeterminate(false));
                fetch(url,apk,expectedSize,digest.substring(7),downloadProgress(expectedSize,say("Downloading Version "+version,"正在下载版本 "+version),true));
                text("Verifying the update…","正在验证更新…");
                PackageInfo candidate=getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES);
                // One message per failed check, so a player's screenshot says which one (Discord, 2026-11-21).
                UpdateError mismatch=candidate==null?new UpdateError("Android could not read the downloaded update. Please try again.","安卓无法读取下载的更新，请重试。"):
                    !getPackageName().equals(candidate.packageName)||!version.equals(candidate.versionName)?new UpdateError("The downloaded file is not version "+version+". Please try again.","下载的文件不是版本 "+version+"，请重试。"):
                    candidate.getLongVersionCode()<=installed.getLongVersionCode()?new UpdateError("Your installed game is already newer than version "+version+".","你安装的游戏已经比版本 "+version+" 更新。"):
                    !sameSigners(installed,candidate)?new UpdateError("This copy of the game wasn’t installed from the official release, so Android can’t update it.\n\nUninstall this copy and install Shadow-Betting.apk from its GitHub release page.",
                        "这份游戏不是从官方发布版本安装的，因此安卓无法更新它。\n\n请卸载这份游戏，再从 GitHub 发布页面安装 Shadow-Betting.apk。"):null;
                if(mismatch!=null){
                    android.util.Log.i("GameUpdate","Candidate rejected: "+(candidate==null?"unreadable":candidate.packageName+" "+candidate.versionName+" "+candidate.getLongVersionCode()+" signers="+(candidate.signingInfo!=null))+" installed="+installed.versionName+" "+installed.getLongVersionCode()+" signers="+(installed.signingInfo!=null));
                    throw mismatch;
                }
                ensureOpen();rememberCandidate();ui(this::requestInstall);
            }catch(Exception error){discardApk();fail(error);}
        });
    }
    private UpdateDownload.Progress downloadProgress(long size,String label,boolean downloading){
        return new UpdateDownload.Progress(){
            private int previous=-1;
            private long started=System.nanoTime(),lastReport;
            public synchronized void update(long bytes){
                int percent=(int)(bytes*100/size);
                long now=System.nanoTime();if(bytes==0){started=now;previous=-1;}
                if(bytes!=0&&percent!=100&&(percent<=previous||now-lastReport<200000000L))return;
                previous=percent;lastReport=now;
                String amount=String.format(Locale.ROOT,"%.1f / %.1f MB",bytes/1048576.0,size/1048576.0);
                double seconds=(now-started)/1e9;
                if(downloading&&seconds>=1&&bytes>0&&percent<100)amount+=String.format(Locale.ROOT," · %.1f MB/s",bytes/1048576.0/seconds);
                final String detail=amount;
                ui(()->{progress.setVisibility(View.VISIBLE);progress.setIndeterminate(false);progress.setProgress(percent);status.setText(downloading&&percent==100?say("Verifying the download…","正在校验下载…"):label+"… "+percent+"%");transfer.setText(detail);});
            }
        };
    }
    private static boolean sameSigners(PackageInfo a,PackageInfo b){
        if(a.signingInfo==null||b.signingInfo==null)return false;
        return new HashSet<>(Arrays.asList(a.signingInfo.getApkContentsSigners())).equals(new HashSet<>(Arrays.asList(b.signingInfo.getApkContentsSigners())));
    }
    private void requestInstall(){
        if(apk==null||!apk.isFile()){fail("The update file is no longer available. Please try again.","更新文件已不存在，请重试。");return;}
        if(!getPackageManager().canRequestPackageInstalls()){
            status.setText(say("Allow this game to install updates in Android Settings, then return here.","请在安卓设置中允许本游戏安装更新，然后返回此处。"));progress.setVisibility(View.GONE);
            awaitingPermission=true;
            try{startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())),1);}catch(ActivityNotFoundException error){awaitingPermission=false;fail("Open Android Settings and allow this game to install updates, then try again.","请打开安卓设置，允许本游戏安装更新，然后重试。");}
            return;
        }
        status.setText(say("Preparing installation… Your saves will be kept.","正在准备安装…你的存档会被保留。"));english.setVisibility(View.GONE);progress.setVisibility(View.VISIBLE);progress.setIndeterminate(true);action.setEnabled(false);
        worker.execute(()->{
            PackageInstaller installer=getPackageManager().getPackageInstaller();
            try{
                ensureOpen();PackageInstaller.SessionParams params=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(getPackageName());params.setSize(expectedSize);
                if(Build.VERSION.SDK_INT>=31)params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED);
                sessionId=installer.createSession(params);rememberCandidate();
                try(PackageInstaller.Session session=installer.openSession(sessionId);InputStream in=new FileInputStream(apk);OutputStream out=session.openWrite("base.apk",0,expectedSize)){
                    UpdateDownload.Progress staged=downloadProgress(expectedSize,say("Preparing installation","正在准备安装"),false);
                    byte[] buf=new byte[65536];long copied=0;int n;while((n=in.read(buf))!=-1){ensureOpen();out.write(buf,0,n);copied+=n;staged.update(copied);}session.fsync(out);
                }
                ensureOpen();
                Intent result=new Intent(this,UpdateActivity.class).setAction("com.shadowrun.shadowbetting.UPDATE_RESULT").setData(Uri.parse("shadow-update:"+sessionId)).putExtra("language",zh?"zh":"en").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
                int flags=PendingIntent.FLAG_UPDATE_CURRENT;if(Build.VERSION.SDK_INT>=31)flags|=PendingIntent.FLAG_MUTABLE;
                try(PackageInstaller.Session session=installer.openSession(sessionId)){
                    ActivityOptions options=ActivityOptions.makeBasic();
                    if(Build.VERSION.SDK_INT>=34)options.setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED);
                    committed=true;
                    try{session.commit(PendingIntent.getActivity(this,sessionId,result,flags,options.toBundle()).getIntentSender());}catch(Exception error){committed=false;throw error;}
                }
                // Retain the verified file until installation succeeds or the user leaves.
            }catch(Exception error){if(sessionId>=0&&!committed)try{installer.abandonSession(sessionId);}catch(Exception ignored){}discardApk();fail(error);}
        });
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==1&&awaitingPermission){awaitingPermission=false;if(getPackageManager().canRequestPackageInstalls())requestInstall();else{status.setText(say("Update paused. Android needs permission to install this update.","更新已暂停：安卓需要权限才能安装此更新。"));action.setText(say("Allow Updates","允许更新"));action.setEnabled(true);action.setOnClickListener(v->requestInstall());}}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.hasExtra(PackageInstaller.EXTRA_STATUS))handleResult(intent);}
    private void handleResult(Intent intent){
        committed=true;
        int result=intent.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);
        String detail=intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        android.util.Log.i("GameUpdate","Installer status="+result+" session="+sessionId+" detail="+detail);
        if(result==PackageInstaller.STATUS_PENDING_USER_ACTION){
            Intent confirmation=intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if(confirmation==null){fail("Android could not open the update confirmation.","安卓无法打开更新确认窗口。");return;}
            status.setText(say("Confirm the update in Android’s installation prompt.","请在安卓的安装提示中确认更新。"));english.setVisibility(View.GONE);
            progress.setVisibility(View.GONE);transfer.setText(say("Version ","版本 ")+version);
            action.setEnabled(false);
            try{startActivity(confirmation);}catch(ActivityNotFoundException error){fail("Android could not open the update confirmation.","安卓无法打开更新确认窗口。");}
        }else if(result==PackageInstaller.STATUS_SUCCESS){
            committed=false;discardApk();UpdateCleanupReceiver.clear(this);progress.setVisibility(View.GONE);english.setVisibility(View.GONE);status.setText(say("Update installed. Your saves are ready.","更新已安装，你的存档已就绪。"));action.setText(say("Play","开始游戏"));action.setEnabled(true);action.setOnClickListener(v->{startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();});
        }else{
            committed=false;
            boolean denied=detail!=null&&detail.toLowerCase(Locale.ROOT).contains("permission denied");
            String en=result==PackageInstaller.STATUS_FAILURE_ABORTED?(denied?"Android denied this installation. Retry to open its confirmation prompt.":"Installation was not completed. You can retry without downloading again."):result==PackageInstaller.STATUS_FAILURE_STORAGE?"Not enough storage to install the update.":result==PackageInstaller.STATUS_FAILURE_BLOCKED?"Android blocked installation. Check the app’s install permission and try again.":"Android could not install the update. Your current game and saves are unchanged.";
            String cn=result==PackageInstaller.STATUS_FAILURE_ABORTED?(denied?"安卓拒绝了此次安装。请重试以打开确认提示。":"安装未完成。可以直接重试，无需重新下载。"):result==PackageInstaller.STATUS_FAILURE_STORAGE?"存储空间不足，无法安装更新。":result==PackageInstaller.STATUS_FAILURE_BLOCKED?"安卓阻止了安装。请检查本应用的安装权限后重试。":"安卓无法安装此更新。你当前的游戏和存档不受影响。";
            // Most failed installs come from the app not being allowed to install updates (player report, 2026-11-13).
            if(result!=PackageInstaller.STATUS_FAILURE_STORAGE){
                en+="\n\nIf it keeps failing, allow updates: open Android Settings › Apps › Shadow Betting › Install unknown apps, turn on “Allow from this source”, then tap Retry Installation.";
                cn+="\n\n如果仍然失败，请允许更新：打开安卓设置 › 应用 › Shadow Betting › 安装未知应用，开启“允许来自此来源”，然后点击“重试安装”。";
            }
            fail(en,cn);
        }
    }
    /** Chinese text for a failure; messages from UpdateDownload and the network stack are English only. */
    static String chinese(Throwable error){
        if(error instanceof UpdateError)return ((UpdateError)error).zh;
        String m=error==null||error.getMessage()==null?"":error.getMessage();
        if(m.startsWith("Could not download the update (HTTP "))return "无法下载更新（HTTP "+m.replaceAll("\\D+","")+"）。请稍后再试。";
        switch(m){
            case "The download is incomplete or damaged. Please try again.":case "Incomplete update download.":case "Unexpected update size.":return "下载不完整或已损坏，请重试。";
            case "Download redirect is missing.":case "Too many download redirects.":case "Unexpected download address.":return "下载地址异常，请稍后再试。";
            case "Download connections did not close. Please try again.":return "下载连接未能关闭，请重试。";
            case "Invalid update response.":return "更新信息无效，请稍后再试。";
            default:return "更新失败。请检查网络连接后重试。";
        }
    }
    private void fail(Throwable error){
        String en=error==null?null:error.getMessage();
        fail(en==null?"Could not update. Check your connection and try again.":en,chinese(error));
    }
    /** Chinese players see the Chinese text with the English below it, so a screenshot in a report is readable either way. */
    private void fail(String en,String cn){committed=false;ui(()->{progress.setVisibility(View.GONE);status.setText(zh?cn:en);english.setText(zh?en:"");english.setVisibility(zh?View.VISIBLE:View.GONE);action.setEnabled(true);boolean retry=apk!=null&&apk.isFile();action.setText(retry?say("Retry Installation","重试安装"):say("Close","关闭"));action.setOnClickListener(v->{if(retry)requestInstall();else finish();});});}
    private SharedPreferences updateState(){return getSharedPreferences("pending-game-update",MODE_PRIVATE);}
    private void rememberCandidate(){if(apk!=null)updateState().edit().putString("file",apk.getName()).putString("version",version).putLong("size",expectedSize).putInt("session",sessionId).apply();}
    private void restoreCandidate(){
        SharedPreferences saved=updateState();String name=saved.getString("file","");
        if(!name.matches("game-update-[A-Za-z0-9_-]+\\.apk"))return;
        File file=new File(getCacheDir(),name);long size=saved.getLong("size",0);
        if(!file.isFile()||file.length()!=size)return;
        apk=file;expectedSize=size;version=saved.getString("version","");sessionId=saved.getInt("session",-1);
    }
    private void discardApk(){File file=apk;apk=null;if(file!=null)file.delete();updateState().edit().clear().apply();}
    @Override public void onBackPressed(){if(committed){Toast.makeText(this,say("Finish the Android installation prompt first.","请先完成安卓的安装提示。"),Toast.LENGTH_SHORT).show();return;}super.onBackPressed();}
    @Override protected void onDestroy(){closed=true;download.cancel();HttpsURLConnection c=connection;if(c!=null)c.disconnect();worker.shutdownNow();if(!committed&&sessionId>=0)try{getPackageManager().getPackageInstaller().abandonSession(sessionId);}catch(Exception ignored){}if(!committed)discardApk();super.onDestroy();}
}
