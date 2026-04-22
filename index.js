const WebSocket = require('ws');
const http = require('http');

const TOKENS = process.env.TOKENS 
    ? process.env.TOKENS.split(',').map(t => t.trim()).filter(t => t.length > 10) 
    : [];

if (TOKENS.length === 0) {
    console.error('[X] TOKENS degiskeni bos!');
    process.exit(1);
}

console.log(`[*] ${TOKENS.length} hesap offline yapilmak uzere isleme aliniyor...`);

function makeOffline(token) {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

    ws.on('open', () => {
        // Discord'a bağlan ve durumu OFFLINE olarak gonder
        ws.send(JSON.stringify({
            op: 2,
            d: {
                token: token,
                properties: { $os: 'linux', $browser: 'chrome', $device: 'pc' },
                presence: { 
                    status: 'offline', // Hesaplari offline yapar
                    afk: true 
                }
            }
        }));
        
        console.log(`[+] Token aktif edildi ve offline komutu gonderildi: ${token.substring(0, 10)}...`);

        // Komutu gönderdikten 5 saniye sonra bağlantıyı kapat ki temizlensin
        setTimeout(() => {
            ws.close();
            console.log(`[V] Baglanti kapatildi, hesap artik cevrimdisi gorunmeli.`);
        }, 5000);
    });

    ws.on('error', (err) => {
        console.error(`[!] Hata olustu (${token.substring(0, 5)}): ${err.message}`);
    });
}

// Tüm tokenları sırayla offline yap
TOKENS.forEach((token, index) => {
    setTimeout(() => makeOffline(token), index * 500); // Discord'u yormamak için 0.5 saniye arayla
});

// Render'ın kapanmaması için basit sunucu
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Hesaplar Offline yapildi.");
}).listen(PORT);
