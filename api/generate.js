// File: api/generate.js
// Fungsi: Menghasilkan 6 bagian Master Prompt dalam format JSON terstruktur sesuai pilihan bahasa pengguna.

export default async function handler(req, res) {
    // 1. Validasi metode request
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    // 2. Ambil API Key rahasia dari Environment Variable Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server belum dikonfigurasi dengan GEMINI_API_KEY.' });
    }

    // 3. Ambil input prompt singkat dan pilihan bahasa dari frontend
    const { shortPrompt, language } = req.body;
    if (!shortPrompt || shortPrompt.trim() === '') {
        return res.status(400).json({ error: 'Ide atau prompt singkat tidak boleh kosong.' });
    }

    // Parameter yang dapat disesuaikan: Model AI Gemini
    const GEMINI_MODEL = "gemini-2.5-flash";

    // Menentukan instruksi bahasa berdasarkan pilihan dropdown pengguna
    const targetLanguage = language === 'en' ? 'English' : 'Bahasa Indonesia';

    // Instruksi sistem untuk memaksa AI mengisi 6 komponen struktur gambar secara tajam
    const systemInstruction = `
Anda adalah ahli Prompt Engineering tingkat senior. Tugas Anda adalah mengubah ide singkat dari pengguna menjadi sebuah "Master Prompt" yang sangat tajam, terstruktur, dan siap pakai.

WAJIB menggunakan bahasa: ${targetLanguage} untuk seluruh isi output.

Anda harus mengembalikan respons HANYA dalam format JSON valid dengan 6 kunci (keys) berikut ini:
1. "role": Peran spesifik yang harus diambil AI beserta keahlian mendalam dan prioritas utamanya (Contoh: "Act as a senior... Prioritize...").
2. "task": Tugas utama secara spesifik, terukur, dan apa hasil akhir yang harus divalidasi/diselesaikan.
3. "context": Poin-poin ("Here's what I know:" atau "Berikut konteks yang diketahui:") berisi asumsi logis mengenai produk/topik, tim/pelaku, sumber daya/batasan, dan risiko utama yang relevan.
4. "reasoning": Tujuan utama ("The goal is..." atau "Tujuannya adalah...") dan mengapa pendekatan berpikir kritis/langkah demi langkah ini penting agar hasilnya benar-benar bisa dieksekusi (actionable).
5. "stop_conditions": Syarat mutlak ("Only stop when:" atau "Berhenti hanya jika:") dalam bentuk poin-poin kapan AI boleh berhenti menulis (misal: jumlah langkah, keterkaitan dengan risiko, dan kesimpulan akhir).
6. "output": Format penyajian yang sangat terstruktur (misal: tabel, rencana mingguan, atau poin-poin spesifik beserta elemen wajib di setiap poinnya).`;

    try {
        // 4. Menghubungi API Google Gemini dengan fitur JSON Output
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [{
                    parts: [{ text: `Buatkan 6 komponen Master Prompt untuk ide berikut: "${shortPrompt}"` }]
                }],
                // Memaksa Gemini membalas dalam format JSON terstruktur agar mudah dipisah ke 6 kotak
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            role: { type: "STRING" },
                            task: { type: "STRING" },
                            context: { type: "STRING" },
                            reasoning: { type: "STRING" },
                            stop_conditions: { type: "STRING" },
                            output: { type: "STRING" }
                        },
                        required: ["role", "task", "context", "reasoning", "stop_conditions", "output"]
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gagal memproses permintaan ke AI.');
        }

        // 5. Mengubah teks JSON dari Gemini menjadi objek JavaScript dan mengirimkannya ke Frontend
        const rawJsonText = data.candidates[0].content.parts[0].text;
        const parsedPrompt = JSON.parse(rawJsonText);

        return res.status(200).json(parsedPrompt);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}