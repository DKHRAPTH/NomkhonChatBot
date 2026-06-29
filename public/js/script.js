(function(){
    /* ============================== */
    /* BACKGROUND PARTICLES           */
    /* ============================== */
    const cvs = document.getElementById('bgCanvas');
    const ctx = cvs.getContext('2d');
    function resizeCvs(){ cvs.width=cvs.parentElement.clientWidth; cvs.height=cvs.parentElement.clientHeight; }
    resizeCvs();
    window.addEventListener('resize', resizeCvs);

    const pts = [];
    for(let i=0;i<40;i++){
        pts.push({
            x: Math.random()*2000, y: Math.random()*2000,
            r: Math.random()*2+.5,
            sx: (Math.random()-.5)*.35, sy: (Math.random()-.5)*.35,
            o: Math.random()*.35+.1,
            c: Math.random()>.5 ? '#FF6B9D' : '#00E5B0'
        });
    }
    function drawBG(){
        const w=cvs.width, h=cvs.height;
        ctx.clearRect(0,0,w,h);
        const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.6);
        g.addColorStop(0,'#0e0e22');
        g.addColorStop(1,'#080818');
        ctx.fillStyle=g;
        ctx.fillRect(0,0,w,h);
        pts.forEach(p=>{
            ctx.globalAlpha=p.o;
            ctx.fillStyle=p.c;
            ctx.beginPath();
            ctx.arc(p.x,p.y,Math.max(.3,p.r),0,Math.PI*2);
            ctx.fill();
            ctx.globalAlpha=p.o*.2;
            ctx.beginPath();
            ctx.arc(p.x,p.y,Math.max(.3,p.r*3),0,Math.PI*2);
            ctx.fill();
            p.x+=p.sx; p.y+=p.sy;
            if(p.x<-10)p.x=w+10; if(p.x>w+10)p.x=-10;
            if(p.y<-10)p.y=h+10; if(p.y>h+10)p.y=-10;
        });
        ctx.globalAlpha=1;
        requestAnimationFrame(drawBG);
    }
    drawBG();

    /* ============================== */
    /* DOM REFS                       */
    /* ============================== */
    const irL=document.getElementById('irL');
    const irR=document.getElementById('irR');
    const csL=document.getElementById('csL');
    const csR=document.getElementById('csR');
    const mouthEl=document.getElementById('mouth');
    const bwL=document.getElementById('bwL');
    const bwR=document.getElementById('bwR');
    const blL=document.getElementById('blL');
    const blR=document.getElementById('blR');
    const laL=document.getElementById('laL');
    const laR=document.getElementById('laR');
    const charSvg=document.getElementById('charSvg');
    const emoBadge=document.getElementById('emoBadge');
    const chatStream=document.getElementById('chatStream');
    const chatInput=document.getElementById('chatInput');
    const sendBtn=document.getElementById('sendBtn');
    const cfgBtn=document.getElementById('cfgBtn');
    const cfgPanel=document.getElementById('cfgPanel');

    /* ============================== */
    /* EXPRESSION DEFINITIONS         */
    /* ============================== */
    const EXPR = {
        normal: {
            lRy:36, rRy:36,
            mouth:'M184,316 Q200,324 216,316', mFill:'none', mSw:'2.5',
            bwL:'M128,198 Q148,185 178,194', bwR:'M222,194 Q252,185 272,198',
            laL:'M124,238 Q138,218 157,214 Q176,218 190,238',
            laR:'M210,238 Q224,218 243,214 Q262,218 276,238',
            blush:.28, irY:0, label:'Normal'
        },
        happy: {
            lRy:20, rRy:20,
            mouth:'M172,308 Q200,342 228,308', mFill:'rgba(216,104,120,0.25)', mSw:'2.5',
            bwL:'M128,193 Q148,180 178,189', bwR:'M222,189 Q252,180 272,193',
            laL:'M124,240 Q138,228 157,225 Q176,228 190,240',
            laR:'M210,240 Q224,228 243,225 Q262,228 276,240',
            blush:.5, irY:0, label:'แฮปปี้'
        },
        shy: {
            lRy:16, rRy:16,
            mouth:'M190,318 Q200,322 210,318', mFill:'none', mSw:'2',
            bwL:'M128,202 Q148,198 178,206', bwR:'M222,206 Q252,198 272,202',
            laL:'M124,242 Q138,234 157,232 Q176,234 190,242',
            laR:'M210,242 Q224,234 243,232 Q262,234 276,242',
            blush:.65, irY:3, label:'เขิน'
        },
        thinking: {
            lRy:30, rRy:24,
            mouth:'M192,318 Q200,316 208,318', mFill:'none', mSw:'2',
            bwL:'M128,196 Q148,186 178,192', bwR:'M222,186 Q252,176 272,190',
            laL:'M124,238 Q138,222 157,218 Q176,222 190,238',
            laR:'M210,234 Q224,216 243,212 Q262,216 276,234',
            blush:.2, irY:-4, label:'กำลังคิด'
        },
        praising: {
            lRy:40, rRy:40,
            mouth:'M170,308 Q200,340 230,308', mFill:'rgba(216,104,120,0.3)', mSw:'2.5',
            bwL:'M128,188 Q148,170 178,180', bwR:'M222,180 Q252,170 272,188',
            laL:'M122,232 Q138,210 157,206 Q176,210 192,232',
            laR:'M208,232 Q224,210 243,206 Q262,210 278,232',
            blush:.45, irY:0, label:'ชื่นชม'
        }
    };

    /* ============================== */
    /* VTUBER STATE                   */
    /* ============================== */
    let mx=window.innerWidth/2, my=window.innerHeight/2;
    let curIX=0, curIY=0, tarIX=0, tarIY=0;
    let curOL=36, curOR=36, tarOL=36, tarOR=36;
    let curExpr='normal';
    let isTalking=false;
    let isBlinking=false;
    let extraIY=0;

    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
    document.addEventListener('touchmove',e=>{mx=e.touches[0].clientX;my=e.touches[0].clientY},{passive:true});

    function updateIris(){
        const r=charSvg.getBoundingClientRect();
        const cx=r.left+r.width/2, cy=r.top+r.height*.465;
        const dx=mx-cx, dy=my-cy;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const f=Math.min(dist/300,1);
        tarIX=(dx/dist)*7*f;
        tarIY=(dy/dist)*7*f+extraIY;
        curIX+=(tarIX-curIX)*.1;
        curIY+=(tarIY-curIY)*.1;
        irL.setAttribute('transform',`translate(${curIX.toFixed(2)},${curIY.toFixed(2)})`);
        irR.setAttribute('transform',`translate(${curIX.toFixed(2)},${curIY.toFixed(2)})`);
    }

    function updateBody(){
        const tilt=(curIX/7)*2.5;
        const t=Date.now();
        const bY=Math.sin(t/1500)*2.5;
        const bS=1+Math.sin(t/1500)*.004;
        charSvg.style.transform=`translateY(${bY.toFixed(2)}px) scale(${bS.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
    }

    function blink(){
        if(isBlinking)return;
        isBlinking=true;
        tarOL=2; tarOR=2;
        setTimeout(()=>{
            tarOL=EXPR[curExpr].lRy; tarOR=EXPR[curExpr].rRy;
            isBlinking=false;
        },130);
    }
    function schedBlink(){setTimeout(()=>{blink();schedBlink()},2200+Math.random()*3500)}
    schedBlink();

    function updateEyes(){
        curOL+=(tarOL-curOL)*.28;
        curOR+=(tarOR-curOR)*.28;
        csL.setAttribute('ry',Math.max(1,curOL).toFixed(1));
        csR.setAttribute('ry',Math.max(1,curOR).toFixed(1));
    }

    function setExpression(name){
        if(!EXPR[name]) name='normal';
        curExpr=name;
        const e=EXPR[name];
        tarOL=e.lRy; tarOR=e.rRy;
        mouthEl.setAttribute('d',e.mouth);
        mouthEl.setAttribute('fill',e.mFill);
        mouthEl.setAttribute('stroke-width',e.mSw);
        bwL.setAttribute('d',e.bwL);
        bwR.setAttribute('d',e.bwR);
        laL.setAttribute('d',e.laL);
        laR.setAttribute('d',e.laR);
        blL.setAttribute('fill',`rgba(255,130,150,${e.blush})`);
        blR.setAttribute('fill',`rgba(255,130,150,${e.blush})`);
        extraIY=e.irY;
        emoBadge.textContent=e.label;
        emoBadge.className='emotion-badge '+name;
    }

    function updateTalk(){
        if(!isTalking)return;
        const t=Date.now()/110;
        const open=(Math.sin(t)*.5+.5)*14;
        const by=314;
        mouthEl.setAttribute('d',`M186,${by} Q200,${by+open} 214,${by}`);
        mouthEl.setAttribute('fill',open>8?'rgba(216,104,120,0.2)':'none');
    }

    function loop(){
        updateIris(); updateEyes(); updateBody(); updateTalk();
        requestAnimationFrame(loop);
    }
    loop();
    setExpression('normal');

    charSvg.addEventListener('click',()=>{
        const prev=curExpr;
        setExpression('praising');
        setTimeout(()=>{if(curExpr==='praising')setExpression(prev)},700);
    });

    cfgBtn.addEventListener('click',()=>cfgPanel.classList.toggle('open'));

        /* ================================================================ */
    /* 🔊 TTS SYSTEM — Typecast (ไฟล์ตรง) + Web Speech API Fallback   */
    /* ================================================================ */
    let isMuted = false;
    let currentAudio = null;
    let typecastAvailable = false;

    // ตรวจสอบว่าเซิร์ฟเวอร์มี Typecast Key ไหม
    fetch('/api/config').then(r=>r.json()).then(d=>{
        typecastAvailable = !!d.typecastApiKey;
        console.log(`🔊 Typecast: ${typecastAvailable ? 'พร้อมใช้งาน' : 'ไม่มี Key — จะใช้ Web Speech API แทน'}`);
    }).catch(()=>{});

    // หยุดการพูดทั้งหมด
    function stopAllSpeech() {
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        isTalking = false;
        const e = EXPR[curExpr];
        mouthEl.setAttribute('d', e.mouth);
        mouthEl.setAttribute('fill', e.mFill);
    }

    // ─── เล่นเสียงผ่าน Typecast API (รับไฟล์ตรง) ───
    async function typecastSpeak(text, emotion) {
        try {
            const resp = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, emotion })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                console.warn('⚠️ Typecast TTS ล้มเหลว:', errData.error || resp.status);
                return false;
            }

            // ✅ รับไฟล์เสียงเป็น Blob โดยตรงจากเซิร์ฟเวอร์
            const audioBlob = await resp.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            stopAllSpeech();
            currentAudio = new Audio(audioUrl);

            return new Promise((resolve) => {
                currentAudio.onplay = () => { isTalking = true; };
                currentAudio.onended = () => {
                    isTalking = false;
                    const e = EXPR[curExpr];
                    mouthEl.setAttribute('d', e.mouth);
                    mouthEl.setAttribute('fill', e.mFill);
                    currentAudio = null;
                    URL.revokeObjectURL(audioUrl); // ล้างหน่วยความจำ
                    resolve(true);
                };
                currentAudio.onerror = () => {
                    console.warn('⚠️ Audio play error');
                    isTalking = false;
                    currentAudio = null;
                    URL.revokeObjectURL(audioUrl);
                    resolve(false);
                };
                currentAudio.play().catch(() => {
                    URL.revokeObjectURL(audioUrl);
                    resolve(false);
                });
            });
        } catch (e) {
            console.warn('⚠️ Typecast TTS Exception:', e.message);
            return false;
        }
    }

    // ─── เล่นเสียงผ่าน Web Speech API (Built-in Browser) ───
    function webSpeak(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('⚠️ เบราว์เซอร์ไม่รองรับ Web Speech API');
            return false;
        }

        stopAllSpeech();

        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'th-TH';
        u.rate = 1.05;
        u.pitch = 1.35;
        u.volume = 1;

        // หาเสียงภาษาไทยที่ดีที่สุด
        const voices = speechSynthesis.getVoices();
        let voice = voices.find(v => v.lang.startsWith('th') && /female|หญิง/i.test(v.name));
        if (!voice) voice = voices.find(v => v.lang === 'th-TH');
        if (!voice) voice = voices.find(v => v.lang.startsWith('th'));
        if (voice) {
            u.voice = voice;
            console.log(`🗣️ ใช้เสียง: ${voice.name} (${voice.lang})`);
        }

        return new Promise((resolve) => {
            u.onstart = () => { isTalking = true; };
            u.onend = () => {
                isTalking = false;
                const e = EXPR[curExpr];
                mouthEl.setAttribute('d', e.mouth);
                mouthEl.setAttribute('fill', e.mFill);
                resolve(true);
            };
            u.onerror = () => {
                isTalking = false;
                resolve(false);
            };

            window.speechSynthesis.speak(u);

            // Chrome Bug Fix
            const keepAlive = setInterval(() => {
                if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
                window.speechSynthesis.resume();
            }, 10000);
        });
    }

    // ─── โหลดเสียงล่วงหน้า ───
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
        }
    }

    // ─── ฟังก์ชันหลัก: พูดข้อความ ───
    async function speakText(text, emotion) {
        if (isMuted || !text || text.trim().length === 0) return;

        const cleanTTS = text.replace(/[\[\]\/EMOTTS:]/g, '').trim();
        if (!cleanTTS) return;

        console.log(`🔊 กำลังพูด: "${cleanTTS.substring(0, 60)}..." (Emotion: ${emotion || 'normal'})`);

        // ลอง Typecast ก่อน → ถ้าล้มเหลวใช้ Web Speech API
        if (typecastAvailable) {
            const ok = await typecastSpeak(cleanTTS, emotion || 'normal');
            if (ok) return;
            console.log('🔄 ลองใช้ Web Speech API แทน...');
        }

        await webSpeak(cleanTTS);
    }

    // ─── ดึงข้อความจากแท็ก [TTS]...[/TTS] ───
    function extractTTS(fullText) {
        const m = fullText.match(/\[TTS\]([\s\S]*?)\[\/TTS\]/);
        if (m) return m[1].trim();
        const clean = fullText.replace(/\[EMO:\w+\]/g, '').replace(/\[TTS\][\s\S]*?\[\/TTS\]/g, '').trim();
        return clean.substring(0, 80);
    }

    // ─── ปุ่ม Mute/Unmute ───
    const muteBtn = document.createElement('button');
    muteBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
    muteBtn.style.cssText = `
        position:fixed; bottom:20px; left:20px; z-index:100;
        width:44px; height:44px; border-radius:50%;
        background:var(--card); border:1px solid var(--border);
        color:var(--accent-mint); cursor:pointer; font-size:16px;
        display:flex; align-items:center; justify-content:center;
        transition:all .2s; backdrop-filter:blur(8px);
    `;
    muteBtn.title = 'เปิด/ปิดเสียง';
    muteBtn.setAttribute('aria-label', 'เปิดปิดเสียง');
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.innerHTML = isMuted
            ? '<i class="fas fa-volume-xmark"></i>'
            : '<i class="fas fa-volume-high"></i>';
        muteBtn.style.color = isMuted ? '#666' : 'var(--accent-mint)';
        if (isMuted) stopAllSpeech();
    });
    document.body.appendChild(muteBtn);

    // ─── เพิ่มปุ่ม 🔊 ฟังซ้ำ ───
    function addReplayBtn(contentEl, ttsText, emotion) {
        // ลบปุ่มเก่าถ้ามี
        const oldBtn = contentEl.querySelector('.replay-btn');
        if (oldBtn) oldBtn.remove();

        const btn = document.createElement('button');
        btn.className = 'replay-btn';
        btn.innerHTML = '<i class="fas fa-volume-high"></i> ฟังอีกครั้ง';
        btn.style.cssText = `
            background:none; border:1px solid var(--border);
            color:var(--accent-mint); cursor:pointer;
            font-size:12px; padding:4px 10px; border-radius:8px;
            margin-top:8px; display:inline-flex; align-items:center; gap:5px;
            transition:all .2s; font-family:'Sarabun',sans-serif;
        `;
        btn.addEventListener('mouseenter', ()=>{btn.style.borderColor='var(--accent-mint)'; btn.style.background='rgba(0,229,176,0.08)';});
        btn.addEventListener('mouseleave', ()=>{btn.style.borderColor='var(--border)'; btn.style.background='none';});
        btn.addEventListener('click', (e)=>{ e.stopPropagation(); speakText(ttsText, emotion); });
        contentEl.appendChild(btn);
    }

    /* ============================== */
    /* CHAT SYSTEM                    */
    /* ============================== */
    let isStreaming = false;

    function escapeHtml(s){
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderMd(text){
        let h=text;
        h=h.replace(/```(\w*)\n([\s\S]*?)```/g,(_,lang,code)=>{
            const id='c'+Math.random().toString(36).substr(2,8);
            return `<div class="code-block-wrapper"><div class="code-block-header"><span>${lang||'code'}</span><button class="copy-btn" onclick="window._copyCode('${id}')"><i class="fas fa-copy"></i> Copy</button></div><pre><code id="${id}">${escapeHtml(code.trim())}</code></pre></div>`;
        });
        h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
        h=h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
        h=h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
        h=h.replace(/\n/g,'<br>');
        return h;
    }

    window._copyCode=function(id){
        const el=document.getElementById(id);
        if(!el)return;
        navigator.clipboard.writeText(el.textContent).then(()=>{
            const btn=el.closest('.code-block-wrapper').querySelector('.copy-btn');
            btn.innerHTML='<i class="fas fa-check"></i> Copied!';
            setTimeout(()=>{btn.innerHTML='<i class="fas fa-copy"></i> Copy'},1500);
        });
    };

    // ─── เพิ่มปุ่ม 🔊 ฟังซ้ำในแต่ละข้อความบอท ───
    function addReplayBtn(contentEl, ttsText) {
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-volume-high"></i>';
        btn.title = 'ฟังอีกครั้ง';
        btn.style.cssText = `
            background:none; border:1px solid var(--border);
            color:var(--accent-mint); cursor:pointer;
            font-size:12px; padding:3px 8px; border-radius:6px;
            margin-top:6px; display:inline-flex; align-items:center; gap:4px;
            transition:all .2s;
        `;
        btn.addEventListener('mouseenter', ()=>{btn.style.borderColor='var(--accent-mint)'; btn.style.background='rgba(0,229,176,0.08)';});
        btn.addEventListener('mouseleave', ()=>{btn.style.borderColor='var(--border)'; btn.style.background='none';});
        btn.addEventListener('click', (e)=>{ e.stopPropagation(); speakText(ttsText); });
        contentEl.appendChild(btn);
    }

    function addMsg(role, content, isTyping){
        const row=document.createElement('div');
        row.className=`chat-row ${role}-row`;
        const avatar=document.createElement('div');
        avatar.className='chat-avatar';
        avatar.textContent=role==='user'?'U':'ข';
        const contentEl=document.createElement('div');
        contentEl.className='chat-content';
        if(isTyping) contentEl.classList.add('typing-cursor');
        contentEl.innerHTML=renderMd(content);
        row.appendChild(avatar);
        row.appendChild(contentEl);
        chatStream.appendChild(row);
        chatStream.scrollTop=chatStream.scrollHeight;
        return contentEl;
    }

    function updateBotMsg(el, text, isTyping){
        el.innerHTML=renderMd(text);
        if(!isTyping) el.classList.remove('typing-cursor');
        chatStream.scrollTop=chatStream.scrollHeight;
    }

    function parseEmotion(text){
        const m=text.match(/\[EMO:(\w+)\]/);
        if(m && EXPR[m[1]]) return m[1];
        return null;
    }

    function cleanText(text){
        return text.replace(/\[EMO:\w+\]/g,'').replace(/\[TTS\][\s\S]*?\[\/TTS\]/g,'').trim();
    }

    async function sendMessage(){
        const msg=chatInput.value.trim();
        if(!msg||isStreaming) return;

        addMsg('user',msg);
        chatInput.value='';
        isStreaming=true;
        sendBtn.disabled=true;

        setExpression('thinking');

        const botEl=addMsg('bot','',true);
        let fullText='';

        try{
            const personality=document.getElementById('personalityInput').value;
            const resp=await fetch('/api/chat',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({userMessage:msg, userPersonality:personality})
            });

            if(!resp.ok) throw new Error('Server error: '+resp.status);

            const reader=resp.body.getReader();
            const decoder=new TextDecoder();
            let buffer='';

            isTalking=true;

            while(true){
                const {done,value}=await reader.read();
                if(done) break;

                buffer+=decoder.decode(value,{stream:true});
                const lines=buffer.split('\n');
                buffer=lines.pop()||'';

                for(const line of lines){
                    if(line.startsWith('data: ')){
                        const data=line.slice(6);
                        if(data==='[DONE]') continue;
                        try{
                            const parsed=JSON.parse(data);
                            if(parsed.text){
                                fullText+=parsed.text;
                                const emo=parseEmotion(fullText);
                                if(emo) setExpression(emo);
                                updateBotMsg(botEl,cleanText(fullText),true);
                            }
                            if(parsed.error){
                                fullText=parsed.error;
                                const emo=parseEmotion(fullText);
                                if(emo) setExpression(emo);
                                updateBotMsg(botEl,cleanText(fullText),true);
                            }
                        }catch(e){}
                    }
                }
            }

            isTalking=false;

            const finalEmo=parseEmotion(fullText);
            if(finalEmo) setExpression(finalEmo);

            const e=EXPR[curExpr];
            mouthEl.setAttribute('d',e.mouth);
            mouthEl.setAttribute('fill',e.mFill);
            mouthEl.setAttribute('stroke-width',e.mSw);

            updateBotMsg(botEl,cleanText(fullText),false);

                        // ─── 🔊 เล่นเสียง TTS ───
            const ttsContent = extractTTS(fullText);
            if (ttsContent) {
                speakText(ttsContent, finalEmo || curExpr);
                addReplayBtn(botEl, ttsContent, finalEmo || curExpr);
            }

        }catch(err){
            isTalking=false;
            setExpression('shy');
            const e=EXPR['shy'];
            mouthEl.setAttribute('d',e.mouth);
            mouthEl.setAttribute('fill',e.mFill);
            mouthEl.setAttribute('stroke-width',e.mSw);
            updateBotMsg(botEl,'งื้อออ... ติดต่อเซิร์ฟเวอร์ไม่ได้เลยค่ะ ลองใหม่นะ!',false);
        }

        isStreaming=false;
        sendBtn.disabled=false;
    }

    sendBtn.addEventListener('click',sendMessage);
    chatInput.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
    });

    chatInput.focus();
})();
