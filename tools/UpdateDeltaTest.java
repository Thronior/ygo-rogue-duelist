package com.shadowrun.game;
import java.io.*;import java.nio.file.*;
public final class UpdateDeltaTest {
 public static void main(String[] args)throws Exception{
  File base=new File(args[0]),patch=new File(args[1]),out=new File(args[2]),expected=new File(args[3]);boolean reject=args.length>4;boolean cancel=args.length>4&&args[4].equals("cancel");
  try{UpdateDelta.apply(base,patch,out,expected.length(),UpdateDelta.hash(expected,()->{}),()->{if(cancel)throw new InterruptedIOException("cancelled");},n->{});if(reject)throw new AssertionError("Accepted invalid patch");if(!UpdateDelta.hash(out,()->{}).equals(UpdateDelta.hash(expected,()->{})))throw new AssertionError("Mismatch");}
  catch(IOException e){if(!reject)throw e;if(out.exists())throw new AssertionError("Partial APK retained");}
  finally{out.delete();}
  System.out.println("PASS "+patch.getName()+(reject?" rejected":" reconstructed exactly"));
 }
}
