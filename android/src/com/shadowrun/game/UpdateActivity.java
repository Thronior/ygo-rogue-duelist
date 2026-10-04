package com.shadowrun.game;

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
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import javax.net.ssl.HttpsURLConnection;

/** Download, verify and install only a newer, identically signed version of this app. */
public final class UpdateActivity extends Activity {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private volatile HttpsURLConnection connection;
    private volatile File apk;
    private TextView status;
    private ProgressBar progress;
    private Button action;
    private volatile int sessionId=-1;
    private volatile boolean committed;
    private boolean awaitingPermission;
    private String version;
    private long expectedSize;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);
        int pad=(int)(24*getResources().getDisplayMetrics().density);panel.setPadding(pad,pad,pad,pad);panel.setBackgroundColor(Color.rgb(8,25,35));
        TextView title=new TextView(this);title.setText("Game Update");title.setTextSize(26);title.setTextColor(Color.rgb(242,220,137));panel.addView(title);
        status=new TextView(this);status.setTextSize(17);status.setTextColor(Color.WHITE);status.setGravity(Gravity.CENTER);status.setPadding(0,pad,0,pad);panel.addView(status);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setIndeterminate(true);panel.addView(progress,new LinearLayout.LayoutParams(-1,pad));
        action=new Button(this);action.setText("Cancel");action.setOnClickListener(v->finish());panel.addView(action);setContentView(panel);
        if(getIntent().hasExtra(PackageInstaller.EXTRA_STATUS)){restoreCandidate();handleResult(getIntent());}else begin();
    }
    private void ui(Runnable task){runOnUiThread(()->{if(!closed&&!isFinishing())task.run();});}
    private void text(String message){ui(()->status.setText(message));}
    private void ensureOpen() throws IOException {if(closed||Thread.currentThread().isInterrupted())throw new InterruptedIOException("Update cancelled");}
    private HttpsURLConnection open(String address) throws IOException {
        URL url=new URL(address);
        for(int redirects=0;redirects<6;redirects++){
            ensureOpen();if(!UpdatePolicy.allowed(url))throw new IOException("Unexpected download address.");
            HttpsURLConnection c=(HttpsURLConnection)url.openConnection();connection=c;c.setConnectTimeout(20000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","YGO-Rogue-Updater");
            int code=c.getResponseCode();
            if(code>=300&&code<400){String next=c.getHeaderField("Location");c.disconnect();if(next==null)throw new IOException("Download redirect is missing.");url=new URL(url,next);continue;}
            if(code!=200){c.disconnect();throw new IOException(code==403||code==429?"Update service is busy. Please try again later.":"Could not download the update (HTTP "+code+").");}
            return c;
        }
        throw new IOException("Too many download redirects.");
    }
    private JSONObject latest() throws Exception {
        HttpsURLConnection c=open("https://api.github.com/repos/Thronior/ygo-rogue-duelist/releases/latest");
        try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){ensureOpen();out.write(buf,0,n);if(out.size()>1024*1024)throw new IOException("Invalid update response.");}
            return new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
        }finally{c.disconnect();connection=null;}
    }
    private void begin(){
        status.setText("Checking for an update…");
        worker.execute(()->{
            try{
                UpdateCleanupReceiver.clear(this);
                JSONObject release=latest();String tag=release.getString("tag_name");
                PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
                if(release.optBoolean("draft")||release.optBoolean("prerelease"))throw new IOException("No stable update is available.");
                if(!UpdatePolicy.newer(tag,installed.versionName)){ui(()->{progress.setVisibility(View.GONE);status.setText("You’re up to date.");action.setText("Close");});return;}
                JSONObject asset=null;JSONArray assets=release.getJSONArray("assets");for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if("YGO-Rogue-Android.apk".equals(a.optString("name"))){asset=a;break;}}
                if(asset==null)throw new IOException("The Android update is not ready yet.");
                String url=asset.getString("browser_download_url"),digest=asset.optString("digest");expectedSize=asset.getLong("size");
                if(!UpdatePolicy.asset(url,tag,digest,expectedSize))throw new IOException("The update details could not be verified.");
                version=tag.replaceFirst("^v", "");
                if(getCacheDir().getUsableSpace()<expectedSize*2+32*1024*1024)throw new IOException("Not enough free space to update. Free some storage and try again.");
                apk=File.createTempFile("game-update-", ".apk",getCacheDir());
                HttpsURLConnection c=open(url);MessageDigest hash=MessageDigest.getInstance("SHA-256");long total=0;int previous=-1;
                ui(()->progress.setIndeterminate(false));
                try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(apk)){
                    byte[] buf=new byte[65536];int n;while((n=in.read(buf))!=-1){ensureOpen();total+=n;if(total>expectedSize)throw new IOException("The downloaded update has an unexpected size.");out.write(buf,0,n);hash.update(buf,0,n);
                        int percent=(int)(total*100/expectedSize);if(percent!=previous){previous=percent;final int p=percent;ui(()->{progress.setProgress(p);status.setText("Downloading Version "+version+"… "+p+"%");});}}
                    out.getFD().sync();
                }finally{c.disconnect();connection=null;}
                StringBuilder hex=new StringBuilder();for(byte b:hash.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));
                if(total!=expectedSize||!hex.toString().equalsIgnoreCase(digest.substring(7)))throw new IOException("The download is incomplete or damaged. Please try again.");
                text("Verifying the update…");
                PackageInfo candidate=getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES);
                if(candidate==null||!getPackageName().equals(candidate.packageName)||!version.equals(candidate.versionName)||candidate.getLongVersionCode()<=installed.getLongVersionCode()||!sameSigners(installed,candidate))throw new IOException("This update does not match the installed game.");
                ensureOpen();rememberCandidate();ui(this::requestInstall);
            }catch(Exception error){discardApk();fail(error.getMessage());}
        });
    }
    private static boolean sameSigners(PackageInfo a,PackageInfo b){
        if(a.signingInfo==null||b.signingInfo==null)return false;
        return new HashSet<>(Arrays.asList(a.signingInfo.getApkContentsSigners())).equals(new HashSet<>(Arrays.asList(b.signingInfo.getApkContentsSigners())));
    }
    private void requestInstall(){
        if(apk==null||!apk.isFile()){fail("The update file is no longer available. Please try again.");return;}
        if(!getPackageManager().canRequestPackageInstalls()){
            status.setText("Allow this game to install updates in Android Settings, then return here.");progress.setVisibility(View.GONE);
            awaitingPermission=true;
            try{startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())),1);}catch(ActivityNotFoundException error){awaitingPermission=false;fail("Open Android Settings and allow this game to install updates, then try again.");}
            return;
        }
        status.setText("Installing Version "+version+"… Your saves will be kept.");progress.setVisibility(View.VISIBLE);progress.setIndeterminate(true);action.setEnabled(false);
        worker.execute(()->{
            PackageInstaller installer=getPackageManager().getPackageInstaller();
            try{
                ensureOpen();PackageInstaller.SessionParams params=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(getPackageName());params.setSize(expectedSize);
                if(Build.VERSION.SDK_INT>=31)params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED);
                sessionId=installer.createSession(params);rememberCandidate();
                try(PackageInstaller.Session session=installer.openSession(sessionId);InputStream in=new FileInputStream(apk);OutputStream out=session.openWrite("base.apk",0,expectedSize)){
                    byte[] buf=new byte[65536];int n;while((n=in.read(buf))!=-1){ensureOpen();out.write(buf,0,n);}session.fsync(out);
                }
                ensureOpen();
                Intent result=new Intent(this,UpdateActivity.class).setAction("com.shadowrun.game.UPDATE_RESULT").setData(Uri.parse("shadow-update:"+sessionId)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
                int flags=PendingIntent.FLAG_UPDATE_CURRENT;if(Build.VERSION.SDK_INT>=31)flags|=PendingIntent.FLAG_MUTABLE;
                try(PackageInstaller.Session session=installer.openSession(sessionId)){
                    ActivityOptions options=ActivityOptions.makeBasic();
                    if(Build.VERSION.SDK_INT>=34)options.setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED);
                    committed=true;
                    try{session.commit(PendingIntent.getActivity(this,sessionId,result,flags,options.toBundle()).getIntentSender());}catch(Exception error){committed=false;throw error;}
                }
                // Retain the verified file until installation succeeds or the user leaves.
            }catch(Exception error){if(sessionId>=0&&!committed)try{installer.abandonSession(sessionId);}catch(Exception ignored){}discardApk();fail(error.getMessage());}
        });
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==1&&awaitingPermission){awaitingPermission=false;if(getPackageManager().canRequestPackageInstalls())requestInstall();else{status.setText("Update paused. Android needs permission to install this update.");action.setText("Allow Updates");action.setEnabled(true);action.setOnClickListener(v->requestInstall());}}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.hasExtra(PackageInstaller.EXTRA_STATUS))handleResult(intent);}
    private void handleResult(Intent intent){
        committed=true;
        int result=intent.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);
        String detail=intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        android.util.Log.i("GameUpdate","Installer status="+result+" session="+sessionId+" detail="+detail);
        if(result==PackageInstaller.STATUS_PENDING_USER_ACTION){
            Intent confirmation=intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if(confirmation==null){fail("Android could not open the update confirmation.");return;}
            status.setText("Confirm the update in Android’s installation prompt.");
            action.setEnabled(false);
            try{startActivity(confirmation);}catch(ActivityNotFoundException error){fail("Android could not open the update confirmation.");}
        }else if(result==PackageInstaller.STATUS_SUCCESS){
            committed=false;discardApk();UpdateCleanupReceiver.clear(this);progress.setVisibility(View.GONE);status.setText("Update installed. Your saves are ready.");action.setText("Play");action.setEnabled(true);action.setOnClickListener(v->{startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();});
        }else{
            committed=false;
            String message=result==PackageInstaller.STATUS_FAILURE_ABORTED?(detail!=null&&detail.toLowerCase(Locale.ROOT).contains("permission denied")?"Android denied this installation. Retry to open its confirmation prompt.":"Installation was not completed. You can retry without downloading again."):result==PackageInstaller.STATUS_FAILURE_STORAGE?"Not enough storage to install the update.":result==PackageInstaller.STATUS_FAILURE_BLOCKED?"Android blocked installation. Check the app’s install permission and try again.":"Android could not install the update. Your current game and saves are unchanged.";fail(message);
        }
    }
    private void fail(String message){committed=false;ui(()->{progress.setVisibility(View.GONE);status.setText(message==null?"Could not update. Check your connection and try again.":message);action.setEnabled(true);boolean retry=apk!=null&&apk.isFile();action.setText(retry?"Retry Installation":"Close");action.setOnClickListener(v->{if(retry)requestInstall();else finish();});});}
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
    @Override public void onBackPressed(){if(committed){Toast.makeText(this,"Finish the Android installation prompt first.",Toast.LENGTH_SHORT).show();return;}super.onBackPressed();}
    @Override protected void onDestroy(){closed=true;HttpsURLConnection c=connection;if(c!=null)c.disconnect();worker.shutdownNow();if(!committed&&sessionId>=0)try{getPackageManager().getPackageInstaller().abandonSession(sessionId);}catch(Exception ignored){}if(!committed)discardApk();super.onDestroy();}
}
