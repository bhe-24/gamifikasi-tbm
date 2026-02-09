const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // SETUP CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    try {
        let bodyData = req.body;
        if (typeof req.body === 'string') {
            try { bodyData = JSON.parse(req.body); } catch (e) { return res.status(400).json({ error: "JSON Error" }); }
        }

        const { text, type } = bodyData; // 'type' bisa 'edit_karya' atau 'nilai_laporan'

        if (!process.env.GEMINI_API_KEY) { return res.status(500).json({ error: "API Key Missing" }); }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        if (type === 'nilai_laporan') {
            // PROMPT KHUSUS PENILAIAN LAPORAN
            prompt = `
                Kamu adalah Guru Bahasa Indonesia. Tugasmu menilai rangkuman buku siswa.
                
                Kriteria Penilaian:
                1. Panjang & Detail (Semakin lengkap semakin bagus).
                2. Pemahaman Isi (Tidak melenceng).
                3. Orisinalitas (Bukan copy-paste mentah).
                4. Jika kurang dari 2 paragraf akan mendapatkan nilai dibawah 30.
                5. Dinilai dari kecakapan menjelaskan, bukan bertele-tele.
                6. Memiliki informasi yang sesuai dan dapat dipertanggungjawabkan

                Berikan output HANYA dalam format JSON seperti ini (Tanpa teks lain):
                {
                    "score": (Angka 10-55),
                    "feedback": "Komentar singkat 1 kalimat untuk siswa",
                    "status": "approved" (atau "rejected" jika isinya asal-asalan/spam)
                }

                Rangkuman Siswa:
                "${text}"
            `;
        } else {
            // PROMPT DEFAULT (EDIT NASKAH)
            prompt = `
                Kamu Editor Sekolah.
                1. Jika mengandung Pornografi/SARA/Kekerasan: Balas "REJECTED".
                2. Jika aman: Perbaiki Typo & PUEBI.
                3. Output: Langsung hasil teks perbaikan.
                
                Naskah: "${text}"
            `;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let outputText = response.text().trim();

        // Bersihkan format JSON jika AI menambahkan backtick
        if (type === 'nilai_laporan') {
            outputText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return res.status(200).json({ result: outputText });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
