# 📚 Panduan Deployment Ms. Maria AI English Tutor

## 🚀 QUICK START - Push ke GitHub & Deploy ke Vercel

### **Opsi 1: Menggunakan GitHub Desktop (PALING MUDAH - RECOMMENDED)**

#### Step 1: Download GitHub Desktop
- Kunjungi: https://desktop.github.com/
- Download dan install aplikasi
- Buka aplikasi GitHub Desktop

#### Step 2: Clone Repository
1. Klik **"File"** → **"Clone Repository"**
2. Pilih tab **"URL"**
3. Paste URL: `https://github.com/kianaputra/english-tutor-ai`
4. Pilih folder tempat menyimpan (contoh: `C:\Users\YourName\Documents\`)
5. Klik **"Clone"**
6. Tunggu proses selesai (1-2 menit)

#### Step 3: Buka Project di File Explorer
1. Di GitHub Desktop, klik **"Show in Explorer"** atau buka folder project secara manual
2. Folder project sudah berisi file `vercel.json` dan `.vercelignore` (saya sudah membuat)

#### Step 4: Commit & Push
1. Kembali ke GitHub Desktop
2. Anda akan melihat tab **"Changes"** dengan file yang berubah
3. Di bagian bawah, ketik pesan commit: `Add Vercel configuration for static site`
4. Klik **"Commit to main"**
5. Klik **"Push origin"** (tombol di bagian atas)
6. Tunggu proses selesai

✅ **Selesai! File sudah ter-push ke GitHub.**

---

### **Opsi 2: Menggunakan Command Prompt (CMD)**

#### Step 1: Buka Command Prompt
- **Windows**: Tekan `Win + R`, ketik `cmd`, tekan Enter
- Atau: Klik Start → ketik `cmd` → Enter

#### Step 2: Navigasi ke Folder Project
Ketik perintah ini (sesuaikan path dengan lokasi folder Anda):

```bash
cd C:\Users\YourName\Documents\english-tutor-ai
```

**Contoh untuk berbagai lokasi:**
- Jika di Desktop: `cd C:\Users\YourName\Desktop\english-tutor-ai`
- Jika di Downloads: `cd C:\Users\YourName\Downloads\english-tutor-ai`

Tekan Enter.

#### Step 3: Jalankan Git Commands
Ketik perintah berikut satu per satu, tekan Enter setelah setiap perintah:

```bash
git add vercel.json .vercelignore
```

```bash
git commit -m "Add Vercel configuration for static site deployment"
```

```bash
git push origin main
```

Tunggu sampai selesai. Jika diminta username/password GitHub, masukkan credentials Anda.

✅ **Selesai! File sudah ter-push ke GitHub.**

---

## 🌐 Deploy ke Vercel

### Step 1: Buka Vercel Dashboard
1. Kunjungi: https://vercel.com/dashboard
2. Login dengan GitHub account Anda

### Step 2: Tunggu Automatic Redeploy
- Setelah push ke GitHub, Vercel akan **otomatis mendeteksi perubahan**
- Vercel akan mulai build & deploy dalam 30 detik
- Lihat status di tab **"Deployments"**
- Tunggu sampai status berubah menjadi **"Ready"** (biasanya 2-5 menit)

### Step 3: Test Aplikasi
1. Klik domain Anda (contoh: `https://english-tutor-ai.vercel.app`)
2. Tunggu halaman load
3. Izinkan akses **kamera** dan **microphone** (penting!)
4. Masukkan Groq API key (dapatkan dari https://console.groq.com)
5. Mulai chat dengan Ms. Maria! 🎉

---

## ⚠️ Troubleshooting

### Masalah: Halaman menampilkan source code
**Solusi:**
1. Pastikan file `vercel.json` sudah di-push
2. Di Vercel dashboard, klik **"Settings"** → **"Advanced"** → **"Clear Build Cache"**
3. Klik **"Redeploy"**
4. Tunggu 2-5 menit

### Masalah: Camera/Microphone tidak bekerja
**Solusi:**
1. Pastikan browser mengizinkan akses kamera dan microphone
2. Klik ikon kunci di address bar → ubah permission menjadi "Allow"
3. Refresh halaman (Ctrl + R)

### Masalah: Groq API error
**Solusi:**
1. Pastikan API key dimulai dengan `gsk_`
2. Dapatkan key gratis dari https://console.groq.com
3. Pastikan API key masih aktif (belum expired)

---

## 📝 Fitur-Fitur Aplikasi

✅ **MediaPipe Face Mesh** - Deteksi wajah dengan 468 landmark  
✅ **Lip-Sync Animation** - Mulut bergerak saat berbicara  
✅ **Groq AI Integration** - 4 mode pembelajaran (Conversation, Grammar, Vocabulary, Role Play)  
✅ **Web Speech API** - Text-to-Speech dan Speech Recognition  
✅ **Face Detection** - Deteksi jarak 2 meter untuk greeting otomatis  
✅ **Responsive Design** - Bekerja di monitor horizontal dan vertikal  

---

## 🔑 Mendapatkan Groq API Key

1. Kunjungi: https://console.groq.com
2. Sign up dengan email atau GitHub
3. Klik **"API Keys"** di sidebar
4. Klik **"Create New API Key"**
5. Copy key (dimulai dengan `gsk_`)
6. Paste di aplikasi Ms. Maria

---

## 📞 Bantuan Lebih Lanjut

Jika ada masalah, beri tahu:
1. Error message yang muncul
2. Screenshot halaman
3. Browser yang digunakan
4. Device yang digunakan (desktop/mobile)

Saya siap membantu! 😊
