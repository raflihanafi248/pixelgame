# Pixel Forest Adventure

Game side-scroller pixel 2D bergaya hutan musim gugur, dibuat dengan [Phaser.js](https://phaser.io/).

## Cerita

Kamu berperan sebagai **Penjaga Hutan**, ksatria bersenjata pedang dan perisai yang harus mengusir kegelapan (goblin, serigala, dan slime) yang menyebar di hutan musim gugur, hingga mencapai gerbang cahaya di ujung hutan.

## Cara menjalankan

Butuh server statis karena game memuat aset lewat `fetch` (tidak bisa dibuka langsung sebagai file lokal).

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
- `assets/` — aset pixel art (background, karakter, musuh, dekorasi)
- `tools/generate_assets.py` — skrip Python (Pillow) yang men-generate semua aset pixel art di atas secara prosedural. Jalankan `python3 tools/generate_assets.py` untuk membuat ulang aset jika ingin diubah.
