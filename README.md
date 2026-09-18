# Pixel Forest Adventure

Game side-scroller pixel 2D bergaya hutan musim gugur, dibuat dengan [Phaser.js](https://phaser.io/).

## Cerita

Kamu berperan sebagai **Penjaga Hutan**, ksatria bersenjata pedang dan perisai yang harus mengusir kegelapan (goblin, serigala, dan slime) yang menyebar di hutan musim gugur, hingga mencapai gerbang cahaya di ujung hutan.

## Cara menjalankan

Cukup buka `index.html` langsung di browser (double-click filenya) — semua aset gambar sudah disematkan sebagai data URI di `src/assets_data.js` jadi tidak butuh server.

Kalau lebih suka lewat server lokal, juga bisa:

```bash
npm start
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` di browser.

## Kontrol

- `A` / `D` atau panah kiri/kanan: bergerak
- `W` atau panah atas: lompat
- `SPACE`: menyerang dengan pedang

## Struktur proyek

- `index.html`, `src/main.js` — kode game (Phaser.js)
- `vendor/phaser.min.js` — library Phaser (di-bundle lokal)
- `assets/` — file PNG aset pixel art mentah (background, karakter, musuh, dekorasi), untuk diedit/dilihat
- `src/assets_data.js` — versi base64 dari isi `assets/`, yang benar-benar dipakai game (auto-generated, jangan edit manual)
- `tools/generate_assets.py` — skrip Python (Pillow) yang men-generate semua PNG pixel art di atas secara prosedural
- `tools/embed_assets.py` — mengonversi isi `assets/` menjadi `src/assets_data.js`

Kalau mengubah tampilan aset, jalankan keduanya berurutan:

```bash
python3 tools/generate_assets.py
python3 tools/embed_assets.py
```
