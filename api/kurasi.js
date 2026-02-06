const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. SETUP CORS (Agar HTML Admin kamu bisa akses Vercel ini)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Boleh diakses dari mana saja (HTML kamu)
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tangani request "OPTIONS" (Pre-flight check browser)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Pastikan method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { naskah } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key belum disetting di Vercel!");
        }

        // 2. KONFIGURASI GEMINI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. PROMPT EDITOR
        const prompt = `
            Kamu adalah Editor Sekolah Profesional. Tugasmu:
            1. Baca naskah cerita siswa di bawah ini.
            2. SENSOR & TOLAK: Jika mengandung Pornografi, LGBT, Kebencian, atau Kekerasan Sadis, balas HANYA dengan kata "REJECTED".
            3. PERBAIKI: Jika aman, perbaiki Ejaan (Typo), Tanda Baca, dan Huruf Kapital agar rapi dan enak dibaca sesuai PUEBI. Jangan mengubah jalan cerita.
            4. OUTPUT: Berikan langsung naskah hasil perbaikan tanpa kata pengantar atau komentar.
            
            Naskah Asli:
            "${naskah}"
        `;

        // 4. KIRIM KE GOOGLE
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. BALAS KE FRONTEND
        return res.status(200).json({ result: text });

    } catch (error) {
        console.error("Error Vercel:", error);
        return res.status(500).json({ error: error.message });
    }
}
