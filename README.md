# Pixel Forest Adventure

Game aksi-platformer pixel 2D dengan 5 level, dibuat dengan [Phaser.js](https://phaser.io/).

## Cerita

Kamu adalah **Sang Penjaga Hutan**. Dedaunan gugur sebelum waktunya, lentera-lentera penjaga padam sendiri, dan sesuatu yang sangat tua sedang terbangun di jantung hutan.

Jejaknya membawamu dari hutan musim gugur, menembus kabut malam, turun ke reruntuhan gua kristal, naik ke puncak yang membeku — sampai ke sarang **Naga Hutan** yang murka. Naga itu bukan monster tanpa alasan: ia mengenali lambang di perisaimu, dan ia menuntut janji yang pernah diingkari manusia.

Akhir ceritanya sengaja dibiarkan terbuka.

## Cara menjalankan

Cukup buka `index.html` di browser (klik dua kali) — semua aset gambar sudah disematkan sebagai data URI, jadi tidak butuh server.

Kalau lebih suka lewat server lokal:

```bash
npm start          # atau: python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Kontrol

| Tombol | Aksi |
| --- | --- |
| `A` / `D` atau `←` `→` | Bergerak |
| `W` / `↑` / `SPASI` | Lompat (tahan untuk lompat lebih tinggi) |
| `J` atau `X` | Serang — combo pedang 3 tahap, serangan udara saat melompat |
| `SHIFT` atau `L` | Dash menghindar (kebal sesaat) |
| `ENTER` | Lanjut di layar judul / cerita |

## Level

1. **Hutan Musim Gugur** — perkenalan: goblin, slime, serigala.
2. **Hutan Malam Berkabut** — gelap, jarak pandang terbatas, arwah mulai muncul.
3. **Gua Kristal** — platforming bertingkat, kelelawar, duri.
4. **Puncak Beku** — permukaan licin, serigala es.
5. **Sarang Sang Naga** — pertarungan boss dengan pola serangan (melayang & menembak bola api, menukik, lalu mendarat — saat mendarat itulah celahmu menyerang).

## Sistem

- **HP & nyawa** — 5 hati, 3 nyawa, kebal sesaat setelah terkena serangan.
- **Checkpoint** — lentera batu di sepanjang level; mati akan mengembalikanmu ke checkpoint terakhir.
- **Kristal** — dikumpulkan sepanjang perjalanan sebagai skor; mengalahkan musuh juga menambah skor.
- **Jurang** — jatuh berarti kehilangan satu nyawa.

## Struktur proyek

```
index.html           halaman game
src/levels.js        data 5 level + teks cerita
src/entities.js      Player (combo, dash, HP), Enemy, Dragon (boss)
src/scenes.js        boot, judul, kartu cerita, gameplay, game over, ending
src/main.js          konfigurasi Phaser
src/assets_data.js   semua aset dalam base64 (auto-generated, jangan diedit manual)
assets/              file PNG mentah
vendor/phaser.min.js library Phaser (di-bundle lokal)
tools/               skrip pembuat & pengemas aset
```

### Membuat ulang aset

```bash
python3 tools/generate_assets.py                 # background, musuh, item, boss (Pillow)
python3 tools/pack_hero.py <folder-sprite-pack>  # sprite sheet karakter utama
python3 tools/embed_assets.py                    # kemas semua PNG jadi src/assets_data.js
```

`generate_assets.py` menggambar semua aset secara prosedural per tema level (autumn, night, cave, snow, lair), jadi mengubah palet satu tema cukup mengubah satu entri di dict `THEMES`.

## Kredit aset

Sprite karakter utama: **2D SL Knight v1.0** — lisensinya mengizinkan penggunaan dan modifikasi, termasuk untuk keperluan komersial, dan melarang menjual ulang asetnya. Aset lain (background, musuh, boss, item, UI) dibuat sendiri lewat `tools/generate_assets.py`.
