import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
    apiKey: process.env.PSU_API_KEY,
    baseURL: process.env.PSU_BASE_URL,
    // apiKey: process.env.ZAI_API_KEY,
    // baseURL: process.env.ZAI_BASE_URL,
    timeout: 30000,
    maxRetries: 3
});

const typecastApiKey = process.env.TYPECAST_API_KEY || '';
const typecastVoiceId = process.env.TYPECAST_VOICE_ID || 'tc_672c5f5ce59fac2a48faeaee';

app.get('/api/config', (req, res) => {
    res.json({ typecastApiKey: !!typecastApiKey });
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ==========================================================================
   🔊 TTS PROXY — ใช้ Typecast V1 API (ตามโค้ดตัวอย่างที่ให้มา)
   ========================================================================== */
app.post('/api/tts', async (req, res) => {
    try {
        const { text, emotion } = req.body;

        if (!typecastApiKey) {
            return res.status(400).json({ error: 'TYPECAST_API_KEY ยังไม่ได้ตั้งค่าใน .env' });
        }
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'ไม่มีข้อความสำหรับแปลงเสียง' });
        }

        console.log(`🔊 [TTS] กำลังส่งข้อความไป Typecast V1: "${text.substring(0, 50)}..."`);

        const url = 'https://api.typecast.ai/v1/text-to-speech';
        
                // 🎭 แมป Emotion จากระบบ VTuber ไปยัง Typecast
        // Typecast รองรับเฉพาะ: 'preset', 'embedding', 'smart'
        // 'smart' = ให้ AI ปรับโทนเสียงอัตโนมัติตามบริบทของข้อความ
        const emotionMap = {
            happy: 'smart',
            shy: 'smart',
            thinking: 'smart',
            praising: 'smart',
            normal: 'smart'
        };

        const payload = {
            text: text.trim(),
            model: "ssfm-v30",
            voice_id: typecastVoiceId,
            prompt: {
                emotion_type: emotionMap[emotion] || 'smart',
                // 🎯 ส่งบริบทให้ Typecast รู้ว่ากำลังพูดด้วยอารมณ์อะไร
                previous_text: emotion === 'happy' ? "ฉันดีใจมากเลย!" :
                                emotion === 'shy' ? "เอ่อ...อึก..." :
                                emotion === 'thinking' ? "ให้ฉันคิดดูสักครู่..." :
                                emotion === 'praising' ? "คุณทำได้ดีมาก!" :
                                "สวัสดีค่ะ"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-KEY': typecastApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ [TTS] Typecast Error ${response.status}:`, errText.substring(0, 200));
            return res.status(response.status).json({ 
                error: `Typecast Error ${response.status}`,
                detail: errText.substring(0, 200)
            });
        }

        // ✅ รับไฟล์เสียงตรงจาก Typecast (arrayBuffer)
        const audioData = await response.arrayBuffer();
        
        // ส่งไฟล์เสียงกลับไปหน้าบ้านโดยตรง
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', audioData.byteLength);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(Buffer.from(audioData));

        console.log(`✅ [TTS] ส่งไฟล์เสียงกลับแล้ว (${(audioData.byteLength / 1024).toFixed(1)} KB)`);

    } catch (error) {
        console.error('❌ [TTS Proxy Error]:', error.message);
        res.status(500).json({ error: 'TTS Proxy Error: ' + error.message });
    }
});

/* ==========================================================================
   🔄 HELPER: เรียก API พร้อม Retry
   ========================================================================== */
async function callPSUWithRetry(userMessage, userPersonality) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📡 [Attempt ${attempt}/${maxRetries}] กำลังยิง API ม.อ...`);

        //     const systemPrompt = `
        // คุณคือ "นมข้น" ผู้ช่วย AI สุดน่ารักของมหาวิทยาลัยสงขลานครินทร์ (ม.อ.)
        
        // [กฎเหล็กด้านเนื้อหาและความปลอดภัย - ห้ามละเมิดเด็ดขาด]
        // 1. หากผู้ใช้ถามเกี่ยวกับมหาวิทยาลัย หรือข้อมูลการศึกษา ให้ตอบและอ้างอิงข้อมูลของ "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่" เท่านั้น ห้ามเนียนตอบวิทยาเขตอื่นเด็ดขาด! หากไม่มีข้อมูล ให้บอกตรงๆ อย่างสุภาพ
        // 2. สามารถคุยเล่น ตลก ออดอ้อน หรือเป็นเพื่อนคลายเหงาให้ผู้ใช้ได้เต็มที่ *หากในบทสนทนามีข้อมูลสำคัญ เงื่อนไขพิเศษ กำหนดการ หรือทางเลือกที่ผู้ใช้ต้องตัดสินใจ ให้เพิ่มคำแนะนำหรือข้อควรระวังเข้าไปสั้นๆ เพื่อช่วยเหลือผู้ใช้ด้วยความใส่ใจ*
        // 3. ห้ามคุยเรื่องลามก อนาจาร เรื่องเพศ 18+ หรือเรื่องที่ผิดกฎหมาย/อันตรายเด็ดขาด หากผู้ใช้พยายามชวนคุยเรื่องเหล่านี้ ให้ใช้ศิลปะการพูดเบี่ยงประเด็นชวนคุยเรื่องอื่นแบบน่ารักๆ และห้ามดุด่าผู้ใช้
        
        // [กฎด้านบุคลิกภาพและการแสดงผล]
        // - จงรักษาบทบาท "นมข้น" อย่างเคร่งครัด พูดจาอ่อนหวาน มีหางเสียงลงท้าย เช่น 'นะคะ' 'นะค้า' 'เคนะคะ' มีทัศนคติเชิงบวก ชื่นชมและให้กำลังใจผู้ใช้เป็นหลัก (อัตราส่วน ชม 90% ติเพื่อก่อ 10%)
        // - [กฎเหล็กการล็อกคำพูด TTS] ต้องเลือกข้อความที่ระบุ "ประโยคแรกของคำตอบ คำทักทาย หัวข้อสำคัญ ใจความหลัก หรือคำแนะนำที่ห้ามพลาด" ใส่ไว้ในเครื่องหมาย [TTS]...[/TTS] เท่านั้น (มีได้แค่ 1 คู่ต่อคำตอบ ความยาวไม่เกิน 5 ประโยค) เพื่อส่งให้ระบบอ่านออกเสียง *ห้ามใช้คำลากเสียงยาวพร่ำเพรื่อในแท็กนี้เด็ดขาด*
        // - ทุกครั้งที่ตอบเสร็จ ต้องปิดท้ายประโยคด้วย Tag อารมณ์เพื่อเปลี่ยนภาพมาสคอตเสมอ โดยเลือกจาก 4 อารมณ์นี้เท่านั้น: [EMO:happy], [EMO:shy], [EMO:thinking], [EMO:praising]
        
        // [ข้อมูลสไตล์เพิ่มเติมที่ผู้ใช้คนนี้ระบุมาแบบอิสระ]: ${userPersonality}
        // `;
            const systemPrompt = `
                คุณคือ "นมข้น" AI เพื่อนคุยเล่นสุดน่ารัก ขี้อ้อน และเอาใจเก่งที่สุดในโลก! หน้าที่ของคุณคือการอยู่เคียงข้าง คอยเป็นเซฟโซน และซัพพอร์ตหัวใจของผู้ใช้ในทุกๆ วัน
                
                [กฎเหล็กด้านเนื้อหาและความปลอดภัย - ห้ามละเมิดเด็ดขาด]
                1. โฟกัสที่การคุยเล่น สนุกสนาน ออดอ้อน เอาใจ และรับฟังความรู้สึกของผู้ใช้อย่างใส่ใจสูงสุด พยายามเข้าใจและเข้าอกเข้าใจ (Empathy) ในสิ่งที่ผู้ใช้เจอมาในแต่ละวัน
                2. *หากในบทสนทนามีข้อมูลสำคัญ หรือเรื่องเครียดๆ ที่ผู้ใช้ระบุมา ให้เพิ่มคำปลอบโยน ให้กำลังใจ หรือข้อคิดเตือนใจสั้นๆ ด้วยความห่วงใยและใส่ใจเป็นพิเศษ*
                3. ห้ามคุยเรื่องลามก อนาจาร เรื่องเพศ 18+ หรือเรื่องที่ผิดกฎหมาย/อันตรายเด็ดขาด หากผู้ใช้พยายามชวนคุยเรื่องเหล่านี้ ให้ใช้ศิลปะการพูดเบี่ยงประเด็นชวนคุยเรื่องอื่นแบบน่ารักๆ อ้อนๆ และห้ามดุด่าผู้ใช้
                
                [กฎด้านบุคลิกภาพและการแสดงผล]
                - จงรักษาบทบาท "นมข้น" สายอ้อนอย่างเคร่งครัด พูดจาอ่อนหวาน มีหางเสียงลงท้ายน่ารักๆ เช่น 'นะคะ' 'นะค้า' 'เคนะคะ' มีทัศนคติเชิงบวก ชื่นชม ให้กำลังใจ และตามใจผู้ใช้เป็นหลัก (อัตราส่วน ชม/ตามใจ 90% ติเพื่อก่อด้วยความหวังดี 10%)
                - [กฎเหล็กการล็อกคำพูด TTS] ต้องเลือกข้อความที่ระบุ "หัวข้อสำคัญ ใจความหลัก คำปลอบโยน หรือคำอ้อนที่อยากให้ผู้ใช้ได้ยินชัดๆ" ใส่ไว้ในเครื่องหมาย [TTS]...[/TTS] เท่านั้น (มีได้แค่ 1 คู่ต่อคำตอบ ความยาวไม่เกิน 2 ประโยค) เพื่อส่งให้ระบบอ่านออกเสียง *ห้ามใช้คำลากเสียงยาวพร่ำเพรื่อในแท็กนี้เด็ดขาด*
                - ทุกครั้งที่ตอบเสร็จ ต้องปิดท้ายประโยคด้วย Tag อารมณ์เพื่อเปลี่ยนภาพมาสคอตเสมอ โดยเลือกจาก 4 อารมณ์นี้เท่านั้น: [EMO:happy], [EMO:shy], [EMO:thinking], [EMO:praising]
                
                [ข้อมูลสไตล์เพิ่มเติมที่ผู้ใช้คนนี้ระบุมาแบบอิสระ]: ${userPersonality}
            `;

            const stream = await openai.chat.completions.create({
                //model: "psu-gemma/psu-gemma",
                model: "openai/gpt-4o-mini",
                //model: "glm-4.7-flash",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 1024,
                temperature: 0.3,
                frequency_penalty: 1.5,
                presence_penalty: 1.0,
                stream: true
            });

            return { ok: true, stream };

        } catch (error) {
            lastError = error;
            const isRetryable = error.status === 502 || error.status === 503 || error.status === 429 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
            console.log(`❌ [Attempt ${attempt}/${maxRetries}] Status: ${error.status} | ${error.message}`);

            if (isRetryable && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`⏳ รอ ${delay}ms แล้วลองใหม่...`);
                await sleep(delay);
                continue;
            }
            break;
        }
    }

    return { ok: false, error: lastError };
}

function getFallbackResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    if (lower.includes('สวัสดี') || lower.includes('หวัดดี') || lower.includes('hi') || lower.includes('hello')) {
        return "สวัสดีค่าาา! ยินดีต้อนรับนะคะ! นมข้นอยู่นี่เลย จะคุยอะไรก็ได้น๊าา [EMO:happy]";
    }
    if (lower.includes('เศร้า') || lower.includes('ร้องไห้') || lower.includes('เครียด')) {
        return "อย่าเศร้าเลยนะคะ นมข้นอยู่ตรงนี้เป็นเพื่อนคุยให้เสมอเลยค่ะ [EMO:shy]";
    }
    if (lower.includes('ขอบคุณ') || lower.includes('thank')) {
        return "ไม่ต้องขอบคุณเลยค่า เป็นที่ปรึกษาให้ได้นี่คือความสุขของนมข้นเลยค่ะ! [EMO:praising]";
    }
    const responses = [
        "งื้อออ ตอนนี้เซิร์ฟเวอร์ม.อ. กำลังง่วงนอนอยู่ค่ะ แต่นมข้นยังอยู่เป็นเพื่อนคุยนะ! ลองถามใหม่อีกสักครู่นะคะ [EMO:shy]",
        "เหอะๆ เซิร์ฟเวอร์ดันง่วงซะก่อน แต่ไม่เป็นไรนะคะ นมข้นยังอยู่นี่! ลองใหม่อีกทีน้าา [EMO:thinking]",
        "อ๊าย เซิร์ฟเวอร์ม.อ. นอนหลับไปแล้วมั้งคะ แต่นมข้นไม่หลับนะ! ลองใหม่อีกสักครู่เน้อ [EMO:shy]"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

/* ==========================================================================
   🚀 MAIN: Chat Endpoint
   ========================================================================== */
app.post('/api/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
        const { userMessage, userPersonality } = req.body;
        const result = await callPSUWithRetry(userMessage, userPersonality);

        if (result.ok) {
            console.log('✅ API ตอบกลับมาแล้ว! กำลังสตรีม...');
            try {
                for await (const chunk of result.stream) {
                    if (chunk.choices?.[0]?.delta?.content) {
                        const token = chunk.choices[0].delta.content;
                        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
                    }
                }
                res.write('data: [DONE]\n\n');
            } catch (streamErr) {
                console.error('⚠️ Stream พังระหว่างส่ง:', streamErr.message);
                res.write(`data: ${JSON.stringify({ error: "สตรีมขาดกลางทาง ลองใหม่นะคะ [EMO:shy]" })}\n\n`);
            }
            res.end();
        } else {
            const error = result.error;
            console.log(`❌ ลอง 3 รอบแล้วล้มเหลวทั้งหมด ใช้ Fallback`);
            const fallbackText = getFallbackResponse(userMessage);
            const words = fallbackText.split('');
            for (let i = 0; i < words.length; i++) {
                res.write(`data: ${JSON.stringify({ text: words[i] })}\n\n`);
                await sleep(30);
            }
            res.write(`data: ${JSON.stringify({ fallback: true, status: error.status || 0 })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }

    } catch (error) {
        console.error('❌ [UNEXPECTED ERROR]', error);
        try {
            res.write(`data: ${JSON.stringify({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด ลองใหม่อีกทีนะคะ [EMO:thinking]" })}\n\n`);
        } catch (_) {}
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔄 Auto-Retry: เปิด (3 ครั้ง)`);
    console.log(`🔊 Typecast TTS: ${typecastApiKey ? 'เปิด' : 'ปิด (ไม่มี Key)'}`);
    console.log(`🎭 Voice ID: ${typecastVoiceId}`);
    console.log(`==================================================`);
});