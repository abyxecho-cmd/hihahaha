const WebSocket = require('ws');
const http = require('http');

const TOKENS = process.env.TOKENS 
    ? process.env.TOKENS.split(',').map(t => t.trim()).filter(t => t.length > 10) 
    : [];

console.log(`[*] ${TOKENS.length} hesap Invisible modunda kilitleniyor...`);

function startBaskinMod(token) {
    let ws;
    
    const connect = () => {
        ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

        ws.on('open', () => {
            // İlk bağlantıda Invisible komutu gönder
            ws.send(JSON.stringify({
                op: 2,
                d: {
                    token: token,
                    properties: { $os: 'linux', $browser: 'chrome', $device: 'pc' },
                    presence: { status: 'invisible', afk: false }
                }
            }));
            console.log(`[+] Kilitlendi: ${token.substring(0, 10)}...`);
        });

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            
            // Heartbeat (Discord ile bağı koparma)
            if (payload.op === 10) {
                setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ op: 1, d: null }));
                        // Agresif mod: Her heartbeat'te durumu tekrar Invisible'a çek
                        ws.send(JSON.stringify({
                            op: 3, // Status Update Operasyonu
                            d: { status: 'invisible', afk: false, since: 0, activities: [] }
                        }));
                    }
                }, payload.d.heartbeat_interval);
            }
        });

        // Bağlantı koparsa (veya diğer kod bizi atarsa) 1 saniye içinde geri bağlan!
        ws.on('close', () => {
            console.log(`[!] Baglanti koptu, tekrar baskin kuruluyor: ${token.substring(0, 5)}`);
            setTimeout(connect, 1000);
        });

        ws.on('error', () => {});
    };

    connect();
}

// Tüm hesapları döngüye al
TOKENS.forEach((token, index) => {
    setTimeout(() => startBaskinMod(token), index * 100);
});

// Render Web Sunucusu
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Baskin Mod Aktif: Hesaplar Invisible modunda kilitli.");
}).listen(process.env.PORT || 3000);
