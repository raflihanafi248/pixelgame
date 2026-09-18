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
| `M` | Nyalakan / matikan suara |
| `ENTER` | Lanjut di layar judul / cerita |

## Level

1. **Hutan Musim Gugur** — perkenalan: goblin, slime, serigala.
2. **Hutan Malam Berkabut** — gelap, jarak pandang terbatas, arwah mulai muncul.
3. **Gua Kristal** — platforming bertingkat, kelelawar, duri.
4. **Puncak Beku** — permukaan licin, serigala es.
5. **Sarang Sang Naga** — pertarungan boss melawan naga merah bersayap membran: ia melayang sambil meraung dan menyemburkan api, menukik menyambar, lalu mendarat kelelahan — saat mendarat itulah celahmu menyerang.

## Audio

Semua suara disintesis langsung lewat Web Audio API — tidak ada satu pun file audio, jadi ukuran game tidak bertambah dan tetap jalan dari `file://`.

- **Musik** bergaya sinematik per level: lapisan pad (saw yang di-detune lewat filter bergerak), sub bass, arpeggio, dan perkusi (taiko di sarang naga, tetesan air di gua).
- **Efek suara berlapis** seperti praktik sound design sungguhan: transient (hentakan awal) + body (bagian bernada) + tail (ekor noise & reverb). Dentang logam dibuat dari partial inharmonis, raungan naga dari saw terdistorsi lewat filter formant.
- **Reverb konvolusi** dengan impulse response yang dibuat sendiri per lingkungan — gua bergema 3,4 detik dan gelap, salju hanya 0,9 detik dan kering.
- **Langkah kaki per permukaan** — daun kering, tanah lembap, batu, salju yang berderik, abu — dipicu berdasarkan jarak tempuh sehingga selalu selaras dengan animasi lari.
- **Posisi stereo** mengikuti posisi objek di dunia: musuh di sebelah kiri terdengar dari kiri, dan makin jauh makin pelan serta makin teredam.
- **Ambience** per level: angin menyapu dedaunan, jangkrik malam, tetesan air gua, badai salju, dentum rendah di sarang naga.
- Setiap bunyi diacak sedikit nada dan volumenya agar tidak terdengar berulang identik.

## Sistem

- **HP & nyawa** — 5 hati, 3 nyawa, kebal sesaat setelah terkena serangan.
- **Armor** — setiap kali mengalahkan musuh kamu mendapat armor berisi 3 lapis. Selama armor menyala (terlihat sebagai kubah energi di sekeliling karakter dan 3 ikon perisai di HUD), serangan musuh menghantam armor, bukan nyawamu. Setelah 3 serangan armor pecah, dan kalahkan musuh lagi untuk memakainya kembali. Jatuh ke jurang tetap mematikan — armor tidak menolong di sana.
- **Checkpoint** — lentera batu di sepanjang level; mati akan mengembalikanmu ke checkpoint terakhir.
- **Kristal** — dikumpulkan sepanjang perjalanan sebagai skor; mengalahkan musuh juga menambah skor.
- **Jurang** — jatuh berarti kehilangan satu nyawa.

## Struktur proyek

```
index.html           halaman game
src/levels.js        data 5 level + teks cerita
src/audio.js         mesin audio (musik, efek, ambience, reverb)
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
