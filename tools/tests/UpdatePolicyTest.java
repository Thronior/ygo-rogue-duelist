package com.shadowrun.game;
import java.net.URL;
public class UpdatePolicyTest {
 static void check(boolean ok){if(!ok)throw new AssertionError();}
 public static void main(String[] args)throws Exception{
  check(UpdatePolicy.newer("v0.1.43","0.1.42")); check(UpdatePolicy.newer("0.10.0","0.9.99"));
  for(String v:new String[]{"v0.1.42","0.1.41","0.1.43-beta","bad","999999999999999999999.1.1"})check(!UpdatePolicy.newer(v,"0.1.42"));
  check(!UpdatePolicy.newer(null,"0.1.42"));
  String url="https://github.com/Thronior/ygo-rogue-duelist/releases/download/v0.1.43/YGO-Rogue-Android.apk",hash="sha256:"+new String(new char[64]).replace('\0','a');
  check(UpdatePolicy.asset(url,"v0.1.43",hash,300000000));
  check(!UpdatePolicy.asset(url.replace("Thronior","attacker"),"v0.1.43",hash,10));
  check(!UpdatePolicy.asset(url,"v0.1.43","",10));check(!UpdatePolicy.asset(url,"v0.1.43",hash,0));check(!UpdatePolicy.asset(url,"v0.1.43",hash,UpdatePolicy.MAX_APK_BYTES+1));
  for(String host:new String[]{"api.github.com","github.com","release-assets.githubusercontent.com","objects.githubusercontent.com"})check(UpdatePolicy.allowed(new URL("https://"+host+"/file")));
  for(String bad:new String[]{"http://github.com/file","https://github.com.evil.test/file","https://evil.test/file","https://user@github.com/file","https://github.com:444/file"})check(!UpdatePolicy.allowed(new URL(bad)));
  System.out.println("PASS updater version, artifact identity, digest, size and redirect validation");
 }
}
