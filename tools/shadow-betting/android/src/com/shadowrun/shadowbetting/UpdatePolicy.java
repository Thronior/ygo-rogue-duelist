package com.shadowrun.shadowbetting;

import java.net.URL;

/** Validation for Shadow Betting's own updates: the fixed "shadow-betting" pre-release of the game's GitHub repository
 *  (never the game's "latest" release, so the two apps never pick up each other's builds). */
final class UpdatePolicy {
    static final long MAX_APK_BYTES = 1024L * 1024 * 1024;
    static final String RELEASE = "https://github.com/Thronior/ygo-rogue-duelist/releases/download/shadow-betting/";
    static final String APK = "Shadow-Betting.apk", MANIFEST = "shadow-betting-manifest.json";
    /** Public GitHub release mirrors that work in mainland China (as in the game's updater). */
    static final String[] MIRRORS = {"https://ghfast.top/", "https://gh-proxy.org/"};
    static boolean newer(String remote, String installed) {
        if (remote==null||installed==null)return false;
        if (!remote.matches("v?\\d+\\.\\d+\\.\\d+") || !installed.matches("v?\\d+\\.\\d+\\.\\d+")) return false;
        String[] a=remote.replaceFirst("^v", "").split("\\."), b=installed.replaceFirst("^v", "").split("\\.");
        try { for(int i=0;i<3;i++){long x=Long.parseLong(a[i]),y=Long.parseLong(b[i]);if(x!=y)return x>y;} } catch(NumberFormatException ignored) {}
        return false;
    }
    static boolean asset(String url, String tag, String digest, long size) {
        return tag.matches("v?\\d+\\.\\d+\\.\\d+") && size>0 && size<=MAX_APK_BYTES && digest.matches("sha256:[0-9a-fA-F]{64}") && url.equals(RELEASE+APK);
    }
    static boolean allowed(URL url) {
        String host=url.getHost();
        return "https".equals(url.getProtocol()) && url.getUserInfo()==null && (url.getPort()==-1||url.getPort()==443) &&
            (host.equals("github.com")||host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com")||
             host.equals("ghfast.top")||host.equals("gh-proxy.org"));
    }
}
