package com.shadowrun.game;

import java.io.*;
import java.security.*;
import java.util.*;
import java.util.zip.GZIPInputStream;

/** Reconstructs exact signed APK bytes with bounded memory and strict input bounds. */
final class UpdateDelta {
    interface Check { void run() throws IOException; }
    static String hash(File file,Check check) throws IOException {
        MessageDigest digest=sha();byte[] buffer=new byte[256*1024];
        try(InputStream in=new FileInputStream(file)){int n;while((n=in.read(buffer))!=-1){check.run();digest.update(buffer,0,n);}}
        return hex(digest.digest());
    }
    private static MessageDigest sha(){try{return MessageDigest.getInstance("SHA-256");}catch(NoSuchAlgorithmException e){throw new AssertionError(e);}}
    private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
    static void apply(File base,File patch,File target,long expectedSize,String expectedHash,Check check,UpdateDownload.Progress progress) throws IOException {
        if(expectedSize<=0||expectedSize>UpdatePolicy.MAX_APK_BYTES)throw new IOException("Invalid reconstructed APK size.");
        boolean success=false;
        try(DataInputStream in=new DataInputStream(new GZIPInputStream(new FileInputStream(patch),64*1024));RandomAccessFile old=new RandomAccessFile(base,"r")){
            byte[] magic=new byte[8];in.readFully(magic);if(!Arrays.equals(magic,new byte[]{'Y','G','O','D','L','T','0','1'}))throw new IOException("Unsupported update patch.");
            long oldSize=in.readLong();byte[] oldHash=new byte[32];in.readFully(oldHash);
            long newSize=in.readLong();byte[] newHash=new byte[32];in.readFully(newHash);
            if(oldSize!=old.length()||newSize!=expectedSize||!hex(newHash).equalsIgnoreCase(expectedHash)||!hash(base,check).equals(hex(oldHash)))throw new IOException("Patch does not match the installed game.");
            try(FileOutputStream out=new FileOutputStream(target)){
                MessageDigest result=sha();byte[] buffer=new byte[256*1024];long written=0;
                for(int records=0;;records++){
                    check.run();if(records>200000)throw new IOException("Too many patch records.");
                    int operation=in.readUnsignedByte();if(operation==2)break;
                    if(operation!=0&&operation!=1)throw new IOException("Invalid patch operation.");
                    long offset=operation==0?in.readLong():0;int length=in.readInt();
                    if(length<=0||length>newSize-written||(operation==0&&(offset<0||offset>oldSize-length)))throw new IOException("Invalid patch bounds.");
                    if(operation==0)old.seek(offset);
                    for(int remaining=length;remaining>0;){
                        check.run();int count=Math.min(remaining,buffer.length);
                        if(operation==0)old.readFully(buffer,0,count);else in.readFully(buffer,0,count);
                        out.write(buffer,0,count);result.update(buffer,0,count);remaining-=count;written+=count;progress.update(written);
                    }
                }
                if(written!=newSize||in.read()!=-1||!Arrays.equals(result.digest(),newHash))throw new IOException("Reconstructed update failed verification.");
                check.run();out.getFD().sync();success=true;
            }
        }finally{if(!success)target.delete();}
    }
}
