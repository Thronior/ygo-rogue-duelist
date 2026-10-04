package com.shadowrun.game;

import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/** Bounded parallel APK transfer; no partial file is ever accepted without its full digest. */
final class UpdateDownload {
    interface Progress { void update(long bytes); }
    interface Connections { HttpURLConnection open(URL url) throws IOException; }
    private final Connections factory;
    private final Set<HttpURLConnection> active=ConcurrentHashMap.newKeySet();
    private volatile boolean cancelled;
    UpdateDownload(){this(url -> (HttpURLConnection)url.openConnection());}
    UpdateDownload(Connections factory){this.factory=factory;}
    void cancel(){cancelled=true;for(HttpURLConnection c:active)c.disconnect();}
    private void check() throws IOException {
        if(cancelled||Thread.currentThread().isInterrupted())throw new InterruptedIOException("Update cancelled");
    }
    private HttpURLConnection open(String address,long first,long last) throws IOException {
        URL url=new URL(address);
        for(int redirects=0;redirects<6;redirects++){
            check();if(!UpdatePolicy.allowed(url))throw new IOException("Unexpected download address.");
            HttpURLConnection c=factory.open(url);active.add(c);
            try {
                check();c.setConnectTimeout(20000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);
                c.setRequestProperty("User-Agent","YGO-Rogue-Updater");c.setRequestProperty("Accept-Encoding","identity");
                if(first>=0)c.setRequestProperty("Range","bytes="+first+"-"+last);
                int code=c.getResponseCode();
                if(code>=300&&code<400){String next=c.getHeaderField("Location");if(next==null)throw new IOException("Download redirect is missing.");url=new URL(url,next);close(c);continue;}
                return c;
            } catch(IOException|RuntimeException error){close(c);throw error;}
        }
        throw new IOException("Too many download redirects.");
    }
    private void close(HttpURLConnection c){active.remove(c);c.disconnect();}
    private void part(String url,File file,long first,long last,long size,AtomicLong received,Progress progress) throws IOException {
        HttpURLConnection c=open(url,first,last);
        try {
            String expected="bytes "+first+"-"+last+"/"+size;
            if(c.getResponseCode()!=206||!expected.equals(c.getHeaderField("Content-Range")))throw new IOException("Server did not provide the requested update section.");
            try(InputStream in=c.getInputStream();RandomAccessFile out=new RandomAccessFile(file,"rw")){
                out.seek(first);byte[] buf=new byte[256*1024];long remaining=last-first+1;
                while(remaining>0){check();int n=in.read(buf,0,(int)Math.min(buf.length,remaining));if(n<0)throw new EOFException("Incomplete update section.");out.write(buf,0,n);remaining-=n;progress.update(received.addAndGet(n));}
                if(in.read()!=-1)throw new IOException("Unexpected update section size.");
            }
        }finally{close(c);}
    }
    private void parallel(String url,File file,long size,Progress progress) throws IOException {
        ExecutorService pool=Executors.newFixedThreadPool(4);
        CompletionService<Void> completed=new ExecutorCompletionService<>(pool);
        List<Future<Void>> jobs=new ArrayList<>();AtomicLong received=new AtomicLong();
        try {
            for(int i=0;i<4;i++){final long first=size*i/4,last=size*(i+1)/4-1;jobs.add(completed.submit(()->{part(url,file,first,last,size,received,progress);return null;}));}
            for(int i=0;i<4;i++)completed.take().get();
        }catch(InterruptedException error){Thread.currentThread().interrupt();throw new InterruptedIOException("Update cancelled");}
        catch(ExecutionException error){throw new IOException("Parallel transfer unavailable.",error.getCause());}
        finally {
            for(Future<Void> job:jobs)job.cancel(true);
            for(HttpURLConnection c:active)c.disconnect();
            pool.shutdownNow();
            try{if(!pool.awaitTermination(35,TimeUnit.SECONDS)){cancel();throw new IOException("Download connections did not close. Please try again.");}}
            catch(InterruptedException error){cancel();Thread.currentThread().interrupt();throw new InterruptedIOException("Update cancelled");}
        }
    }
    private void single(String url,File file,long size,Progress progress) throws IOException {
        HttpURLConnection c=open(url,-1,-1);
        try {
            if(c.getResponseCode()!=200)throw new IOException("Could not download the update (HTTP "+c.getResponseCode()+").");
            try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(file)){
                byte[] buf=new byte[256*1024];long total=0;int n;
                while((n=in.read(buf))!=-1){check();total+=n;if(total>size)throw new IOException("Unexpected update size.");out.write(buf,0,n);progress.update(total);}
                if(total!=size)throw new EOFException("Incomplete update download.");
            }
        }finally{close(c);}
    }
    void download(String url,File file,long size,String digest,Progress progress) throws IOException {
        check();
        if(size>=8*1024*1024){
            try{parallel(url,file,size,progress);}
            catch(IOException error){check();progress.update(0);single(url,file,size,progress);}
        }else single(url,file,size,progress);
        check();
        try {
            MessageDigest hash=MessageDigest.getInstance("SHA-256");
            try(InputStream in=new FileInputStream(file)){
                byte[] buf=new byte[256*1024];int n;while((n=in.read(buf))!=-1){check();hash.update(buf,0,n);}
            }
            StringBuilder hex=new StringBuilder();for(byte b:hash.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));
            if(file.length()!=size||!hex.toString().equalsIgnoreCase(digest))throw new IOException("The download is incomplete or damaged. Please try again.");
            try(RandomAccessFile out=new RandomAccessFile(file,"rw")){out.getFD().sync();}
        }catch(java.security.NoSuchAlgorithmException error){throw new IOException(error);}
        check();
    }
}
