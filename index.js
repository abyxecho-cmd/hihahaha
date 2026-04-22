const http = require('http');
const WebSocket = require('ws');

// Ortam değişkenlerini al
const TOKENS = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()).filter(Boolean) : [];
const CHANNEL_IDS = process.env.CHANNEL_IDS ? process.env.CHANNEL_IDS.split(',').map(c => c.trim()).filter(Boolean) : [];
const MESSAGES = [process.env.MESSAGE1, process.env.MESSAGE2].filter(Boolean);

if (!TOKENS.length || !CHANNEL_IDS.length || MESSAGES.length === 0) {
    console.error('[X] Degiskenler eksik! TOKENS, CHANNEL_IDS ve MESSAGE1 doldurulmali.');
    process.exit(1);
}

let totalSent = 0;

// Token durumlarını "Görünmez" yapmak için Gateway bağlantısı
function setInvisible(token) {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

    ws.on('open', () => {
        ws.send(JSON.stringify({
            op: 2,
            d: {
                token: token,
                properties: { $os: 'windows', $browser: 'chrome', $device: 'pc' },
                presence: { status: 'invisible', afk: false } // İŞTE BURASI: Hesabı görünmez yapar
            }
        }));
    });

    ws.on('message', (data) => {
        const payload = JSON.parse(data);
        if (payload.op === 10) { // Hello
            setInterval(() => ws.send(JSON.stringify({ op: 1, d: null })), payload.d.heartbeat_interval);
        }
    });

    ws.on('error', () => {}); 
    ws.on('close', () => setTimeout(() => setInvisible(token), 10000)); // Koparsa tekrar bağlan
}

// Mesaj Gönderme Fonksiyonu (Daha güvenli hızda)
let currentTokenIndex = 0;
async function tick() {
    const token = TOKENS[currentTokenIndex];
    currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length;

    const channelId = CHANNEL_IDS[Math.floor(Math.random() * CHANNEL_IDS.length)];
    const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    try {
        const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({ content: message })
        });

        if (res.ok) {
            totalSent++;
            console.log(`[+] Mesaj Gonderildi! | Toplam: ${totalSent}`);
        } else if (res.status === 429) {
            console.warn(`[!] Rate Limit! Biraz yavaslaniyor...`);
        }
    } catch (e) { }

    // Hız Sınırı: 90 token için her mesaj arası 1-2 saniye bekleme idealdir.
    setTimeout(tick, 2000); 
}

// Tüm tokenları görünmez yap ve başlat
console.log(`[*] ${TOKENS.length} hesap gorunmez yapiliyor...`);
TOKENS.forEach(setInvisible);
setTimeout(tick, 5000); // Bağlantılar kurulunca mesajlara başla

// Render.com için Port Dinleme (Kapanmaması için)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Sistem Aktif | Token Sayisi: ${TOKENS.length} | Gonderilen: ${totalSent}`);
}).listen(PORT);
