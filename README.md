# Automata Theory Toolkit

Toolkit berbasis web untuk visualisasi dan manipulasi Automata (DFA, NFA), konversi Regex ke NFA, minimisasi, dan pengecekan ekivalensi.

## 📂 Struktur Repositori

Patuhi struktur folder berikut untuk menjaga keteraturan kode:

```text
automata_web/
├── index.html          # HTML murni, hanya struktur & markup
├── css/
│   ├── base.css        # Variables, reset, layout utama
│   ├── components.css  # Card, button, form, table, badge, trace
│   ├── graph.css       # SVG canvas & state node styling
│   └── tabs.css        # Tab navigation
└── js/
    ├── dfa.js          # [Anggota A] Class DFA
    ├── nfa.js          # [Anggota B] Class NFA + epsilon-closure
    ├── regex.js        # [Anggota B] Thompson's Construction
    ├── minimizer.js    # [Anggota C] Partition Refinement
    ├── equivalence.js  # [Anggota C] Product Construction
    ├── graph.js        # [Anggota D] SVG drawing engine
    ├── table.js        # [Anggota D] Table & result renderers
    ├── ui.js           # [Anggota D] Tab switch, form parse, helpers
    └── main.js         # [Anggota D] App controller & event handlers
```

## 🛠 Aturan Pengembangan (Repository Rules)

1. **Modularitas**: Setiap fitur logika automata harus dipisahkan ke dalam file JS masing-masing sesuai pembagian tugas.
2. **Vanilla JS & CSS**: Gunakan JavaScript murni dan CSS murni. Jangan menambahkan library eksternal tanpa kesepakatan bersama.
3. **Pemisahan Logika & UI**: 
   - Logika automata (NFA/DFA/Regex) diletakkan di file logikanya sendiri.
   - Manipulasi DOM dan rendering hanya boleh dilakukan di `graph.js`, `table.js`, `ui.js`, atau `main.js`.
4. **Komentar Kode**: Berikan komentar pada fungsi-fungsi yang kompleks agar anggota lain mudah memahami alurnya.
5. **Responsive Design**: Pastikan UI tetap rapi saat dibuka di berbagai resolusi layar.

## 🚀 Cara Menjalankan

Cukup buka `index.html` langsung di browser atau gunakan extension **Live Server** di VS Code untuk pengalaman pengembangan yang lebih baik.

---
*Proyek ini dibuat untuk tugas mata kuliah Teori Bahasa dan Automata (TBA).*
