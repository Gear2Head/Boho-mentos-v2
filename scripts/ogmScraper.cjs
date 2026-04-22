const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- HIZ VE GÜVENLIK AYARLARI ---
const TARGET_SUBJECTS = ['matematik', 'fizik', 'kimya', 'biyoloji'];
const BASE_URL = 'https://ogmmateryal.eba.gov.tr/soru-bankasi-kazanim/';
const DB_PATH = path.join(__dirname, '../src/data/questions-db.json');
const IMG_DIR = path.join(__dirname, '../public/assets/questions');

// Resim klasörü yoksa oluştur
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// Rastgele bekleme fonksiyonu (Ban yememek için)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomSleep = () => sleep(Math.floor(Math.random() * 2000) + 1000);

// Resim Indirme Köprüsü
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
           .on('error', reject)
           .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Resim indirilemedi, Status: ${res.statusCode}`));
      }
    });
  });
};

(async () => {
    console.log("🔥 [BohoMentosluk] OGM Scraper (Data Intelligence Bot) başlatılıyor...");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] // Hotlink vs güvenlik aşımları için
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BohoMentosBot/1.0');
    
    let allQuestions = [];
    
    // Zaten JSON varsa üstüne ekle, yoksa sıfırdan başla.
    if (fs.existsSync(DB_PATH)) {
        try {
            allQuestions = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
            console.log(`Veritabanında mevcut ${allQuestions.length} soru bulundu.`);
        } catch(e) {}
    }

    try {
        for (const subject of TARGET_SUBJECTS) {
            console.log(`\n📌 Branş Kuşatması Başlıyor: ${subject.toUpperCase()}...`);
            const url = `${BASE_URL}${subject}`;
            
            try {
               await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
               await randomSleep();
               
               // Bu bölüm OGM sayfasının (örneğin Test/Soru listesi) yüklenmesine bağlı olarak tetiklenir
               // Not: OGM sitesi dinamik yükleme ile soruları listeliyorsa `scroll` veya `click` gerektirebilir
               // O yüzden sayfanın en temel elementlerini çekiyoruz:
               
               const scrapedData = await page.evaluate(async (subjectName) => {
                    const questions = [];
                    // Örnek Selectorler: '.soru-item', '.question-container'. (Site güncellendikçe burası modifiye dilebilir)
                    const questionNodes = document.querySelectorAll('.soru-icerik, .question-card, .soruPanel');
                    
                    for (let i = 0; i < questionNodes.length; i++) {
                        const qNode = questionNodes[i];
                        
                        // 1. MathJax Parser (MHTML veya SVG'yi KaTeX'e çevirme)
                        // OGM'deki LaTeX verisi genellikle <annotation encoding="application/x-tex"> etiketi içindedir.
                        const mathJaxAnnotations = qNode.querySelectorAll('annotation[encoding="application/x-tex"]');
                        let qHtml = qNode.innerHTML;
                        
                        mathJaxAnnotations.forEach(anno => {
                            const latexString = ` \\( ${anno.textContent} \\) `;
                            // MathJax kapsayıcısını bulup yer değiştirmeye çalış (Basit çözüm)
                            const mathParent = anno.closest('.MathJax_Display, .mjx-chtml, .MathJax, mjx-container');
                            if (mathParent) {
                                mathParent.outerHTML = latexString; 
                            }
                        });

                        // Sorunun Metni Ve Şıkları (Basit)
                        const qTextElement = qNode.querySelector('.soru-metni, p');
                        const text = qTextElement ? qTextElement.innerText : '';
                        
                        // Resim varsa
                        const imgNode = qNode.querySelector('img');
                        const imgUrl = imgNode ? imgNode.src : null;

                        // Şıklar
                        const optionNodes = qNode.querySelectorAll('.secenek, .option, li');
                        const options = Array.from(optionNodes).map(o => o.innerText.trim());
                        
                        // Doğru Cevap
                        const answerNode = qNode.querySelector('.dogru-cevap, .answer');
                        const answer = answerNode ? answerNode.innerText.trim() : 'Bilinmiyor';

                        if(text && options.length > 0) {
                            questions.push({
                                id: `OGM-${subjectName.toUpperCase()}-${Date.now()}-${i}`,
                                subject: subjectName,
                                questionText: text,
                                imageRawUrl: imgUrl,
                                options: options,
                                correctAnswer: answer,
                                source: 'OGM Materyal',
                                difficulty: Math.random() > 0.5 ? 'Zor' : (Math.random() > 0.5 ? 'Orta' : 'Kolay') // Geçici Liyakat tahmini
                            });
                        }
                    }
                    return questions;
               }, subject);

               console.log(`[!] Sayfadan ${scrapedData.length} soru tespit edildi. (Resimler indirilecek)`);
               
               for (const q of scrapedData) {
                   if (q.imageRawUrl) {
                       const ext = path.extname(q.imageRawUrl.split('?')[0]) || '.jpg';
                       const imgName = `${q.id}${ext}`;
                       const localPath = path.join(IMG_DIR, imgName);
                       try {
                           await downloadImage(q.imageRawUrl, localPath);
                           q.image = `/assets/questions/${imgName}`; // Offline react format
                           await randomSleep(); // IP ban yememek için!
                       } catch(err) {
                           console.log(`🖼️ [HATA] Resim korumalı veya 404: ${q.imageRawUrl}`);
                       }
                       delete q.imageRawUrl;
                   }
                   allQuestions.push(q);
               }

            } catch(e) {
                console.error(`🚨 [${subject.toUpperCase()}] Hatalı atlandı: ${e.message}`);
            }
        }
        
        fs.writeFileSync(DB_PATH, JSON.stringify(allQuestions, null, 2));
        console.log(`\n🎉 BAŞARILI! Toplam ${allQuestions.length} soru "questions-db.json" üzerine gömüldü.`);
        console.log(`Uygulama artık Offline-First modda OGM verisi kullanabiliyor!`);

    } catch (globalError) {
        console.error("KRİTİK HATA:", globalError);
    } finally {
        await browser.close();
    }
})();
