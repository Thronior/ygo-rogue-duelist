package com.shadowrun.game;

import java.net.URL;


/** Pure validation shared by the native updater and its host-side tests. */
final class UpdatePolicy {
    static final long MAX_APK_BYTES = 1024L * 1024 * 1024;
    static boolean newer(String remote, String installed) {
        if (remote==null||installed==null)return false;
        if (!remote.matches("v?\\d+\\.\\d+\\.\\d+") || !installed.matches("v?\\d+\\.\\d+\\.\\d+")) return false;
        String[] a=remote.replaceFirst("^v", "").split("\\."), b=installed.replaceFirst("^v", "").split("\\.");
        try { for(int i=0;i<3;i++){long x=Long.parseLong(a[i]),y=Long.parseLong(b[i]);if(x!=y)return x>y;} } catch(NumberFormatException ignored) {}
        return false;
    }
    static boolean asset(String url, String tag, String digest, long size) {
        return tag.matches("v?\\d+\\.\\d+\\.\\d+") && size>0 && size<=MAX_APK_BYTES &&
            digest.matches("sha256:[0-9a-fA-F]{64}") &&
            url.equals("https://github.com/Thronior/ygo-rogue-duelist/releases/download/"+tag+"/YGO-Rogue-Android.apk");
    }
    static boolean allowed(URL url) {
        String host=url.getHost();
        return "https".equals(url.getProtocol()) && url.getUserInfo()==null && (url.getPort()==-1||url.getPort()==443) &&
            (host.equals("api.github.com")||host.equals("github.com")||host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com"));
    }
}
