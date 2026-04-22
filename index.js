const WebSocket = require('ws');
const http = require('http');

const TOKENS = process.env.TOKENS 
    ? process.env.TOKENS.split(',').map(t => t.trim()).filter(t => t.length > 10) 
    : [];

console.log(`[*] ${TOKENS.length} hesap Rahatsız Etmeyin (DND) modunda sabitleniyor...`);

function startDNDFix(token) {
    let ws;
    let heartbeatInterval;
    
    const connect = () => {
        // Discord Gateway bağlantısı
        ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

        ws.on('open', () => {
            // İlk girişte DND (Rahatsız Etmeyin) olarak bağlan
            ws.send(JSON.stringify({
                op: 2,
                d: {
                    token: token,
                    properties: { $os: 'linux', $browser: 'chrome', $device: 'pc' },
                    presence: { 
                        status: 'dnd', // Rahatsız Etmeyin modu
                        afk: false 
                    }
                }
            }));
            console.log(`[+] DND Sabitlendi: ${token.substring(0, 10)}...`);
        });

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            
            // Heartbeat (Bağlantıyı canlı tutma)
            if (payload.op === 10) {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                
                heartbeatInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        // Discord'a "ben hala buradayım" de
                        ws.send(JSON.stringify({ op: 1, d: null }));
                        
                        // Ekstra baskınlık: Her heartbeat'te statüyü tekrar DND'ye zorla
                        ws.send(JSON.stringify({
                            op: 3, 
                            d: { 
                                status: 'dnd', 
                                afk: false, 
                                since: 0, 
                                activities: [] 
                            }
                        }));
                    }
                }, payload.d.heartbeat_interval);
            }
        });

        // Diğer kod bizi oturumdan atarsa 1 saniye içinde geri saldır
        ws.on('close', () => {
            console.log(`[!] Baglanti kesildi, tekrar DND moduna geciliyor: ${token.substring(0, 5)}`);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            setTimeout(connect, 1000);
        });

        ws.on('error', () => {});
    };

    connect();
}

// 90 hesabı hızlıca başlat (100ms aralıkla)
TOKENS.forEach((token, index) => {
    setTimeout(() => startDNDFix(token), index * 100);
});

// Render için mecburi web sunucusu
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("DND Sabitleyici Aktif. Hesaplar kilitlendi.");
}).listen(PORT);
