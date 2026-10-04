package com.shadowrun.game;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.io.File;

/** Self-replacement kills the old process, so cleanup must also run in the new app. */
public final class UpdateCleanupReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) clear(context);
    }

    // Some vendors block the replacement broadcast. Retry when the updated app opens.
    static void clearInstalled(Context context) {
        String pending = context.getSharedPreferences("pending-game-update", Context.MODE_PRIVATE)
            .getString("version", "");
        if (pending.isEmpty()) return;
        try {
            String installed = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName;
            if (pending.equals(installed) || UpdatePolicy.newer(installed, pending)) clear(context);
        } catch (android.content.pm.PackageManager.NameNotFoundException ignored) {}
    }

    static void clear(Context context) {
        File[] files = context.getCacheDir().listFiles((dir, name) ->
            name.matches("game-update-[A-Za-z0-9_-]+\\.(apk|delta\\.gz)"));
        int removed = 0;
        if (files != null) for (File file : files) if (file.isFile() && file.delete()) removed++;
        context.getSharedPreferences("pending-game-update", Context.MODE_PRIVATE).edit().clear().commit();
        android.util.Log.i("GameUpdate", "Removed " + removed + " cached update APK(s)");
    }
}
