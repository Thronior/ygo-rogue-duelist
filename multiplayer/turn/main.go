// Shadow Run TURN relay, using Pion's TURN implementation (MIT).
package main
import (
 "crypto/hmac"
 "crypto/sha1"
 "crypto/tls"
 "encoding/base64"
 "flag"
 "log"
 "net"
 "os"
 "os/signal"
 "strconv"
 "strings"
 "time"
 "github.com/pion/turn/v5"
)
func main() {
 bind:=flag.String("bind","127.0.0.1","Listening interface; use 0.0.0.0 for a public server")
 public:=flag.String("public-ip","127.0.0.1","Externally reachable relay IP")
 port:=flag.String("port","3478","UDP/TCP listener port")
 cert:=flag.String("cert","","Optional TLS certificate")
 key:=flag.String("key","","Optional TLS private key")
 local:=flag.Bool("local-test",false,"Allow loopback/private peers for isolated testing")
 flag.Parse()
 secret:=os.Getenv("TAG_TURN_SECRET");if len(secret)<32 {log.Fatal("Set TAG_TURN_SECRET to at least 32 random characters")}
 ip:=net.ParseIP(*public);if ip==nil {log.Fatal("Invalid public IP")}
 realm:="shadow-run"
 auth:=func(a *turn.RequestAttributes)(string,[]byte,bool) {
  expiry,err:=strconv.ParseInt(strings.SplitN(a.Username,":",2)[0],10,64)
  now:=time.Now().Unix();if err!=nil||expiry<now||expiry>now+86460 {return "",nil,false}
  mac:=hmac.New(sha1.New,[]byte(secret));mac.Write([]byte(a.Username))
  password:=base64.StdEncoding.EncodeToString(mac.Sum(nil))
  return a.Username,turn.GenerateAuthKey(a.Username,realm,password),true
 }
 permission:=func(_ net.Addr,peer net.IP)bool {
  return *local || (peer.IsGlobalUnicast()&&!peer.IsPrivate()&&!peer.IsLoopback()&&!peer.IsLinkLocalUnicast())
 }
 generator:=&turn.RelayAddressGeneratorPortRange{RelayAddress:ip,Address:*bind,MinPort:49160,MaxPort:49259}
 address:=net.JoinHostPort(*bind,*port)
 udp,err:=net.ListenPacket("udp4",address);if err!=nil {log.Fatal(err)}
 tcp,err:=net.Listen("tcp4",address);if err!=nil {log.Fatal(err)}
 config:=turn.ServerConfig{Realm:realm,AuthHandler:auth,
  PacketConnConfigs:[]turn.PacketConnConfig{{PacketConn:udp,RelayAddressGenerator:generator,PermissionHandler:permission}},
  ListenerConfigs:[]turn.ListenerConfig{{Listener:tcp,RelayAddressGenerator:generator,PermissionHandler:permission}}}
 if *cert!="" {
  pair,err:=tls.LoadX509KeyPair(*cert,*key);if err!=nil {log.Fatal(err)}
  listener,err:=tls.Listen("tcp4",net.JoinHostPort(*bind,"5349"),&tls.Config{Certificates:[]tls.Certificate{pair},MinVersion:tls.VersionTLS12});if err!=nil {log.Fatal(err)}
  config.ListenerConfigs=append(config.ListenerConfigs,turn.ListenerConfig{Listener:listener,RelayAddressGenerator:generator,PermissionHandler:permission})
 }
 server,err:=turn.NewServer(config);if err!=nil {log.Fatal(err)}
 log.Printf("TURN ready on %s (relay UDP 49160-49259)",address)
 stop:=make(chan os.Signal,1);signal.Notify(stop,os.Interrupt);<-stop;server.Close()
}
