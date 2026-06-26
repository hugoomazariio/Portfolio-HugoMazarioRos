# OPTIMIZATIONS.md — Kintarowwwards Full Audit

---

## 1) Optimizasyon Özeti

**Genel Sağlık:** Orta-İyi. Proje zaten IntersectionObserver ile canvas duraklatma, `React.memo`, `useMemo` gibi iyi pratikleri uygulamış. Ancak birkaç kritik ve orta seviye iyileştirme fırsatı mevcut.

**En Yüksek Etkili 3 İyileştirme:**
1. **Preloader tema değişikliğinde gereksiz yeniden tetikleniyor** — Her tema değişikliğinde 1.2s tam preloader gösteriliyor, UX'i ciddi şekilde bozuyor
2. **HangingProfile sürekli rAF döngüsü** — Görünürlük kontrolü yok, sekme arka plandayken bile CPU tüketiyor
3. **CustomCursor render sırasında `window.matchMedia` çağrısı** — SSR uyumsuz, hydration mismatch riski

**Değişiklik yapılmazsa en büyük risk:** Preloader'ın tema geçişinde tekrar tetiklenmesi kullanıcı deneyimini ciddi ölçüde kötüleştirir. HangingProfile'ın sınırsız animasyonu mobil cihazlarda pil tüketir.

---

## 2) Bulgular (Öncelikli Sırayla)

### F4: BlurReveal — `once: false` Gereksiz Re-animasyon
- **Kategori:** CPU / Frontend
- **Şiddet:** Orta
- **Etki:** GPU, rendering performansı
- **Kanıt:** `blur-reveal.tsx:22` — `viewport={{ once: false }}`
- **Neden verimsiz:** Her scroll'da viewport'a giren/çıkan tüm BlurReveal elementleri tekrar animasyon yapıyor. Sayfa ~20+ BlurReveal kullanıyor. `will-change` ile birleşince GPU layer sayısı artıyor.
- **Önerilen düzeltme:** `once: true` yaparak bir kez animasyon göster. Kullanıcı "gördüm" hissini zaten aldıktan sonra tekrar blur+fade gereksiz.
- **Takas/Risk:** Tasarım tercihi — bazıları tekrarlı animasyonu tercih edebilir
- **Beklenen etki:** Scroll sırasında GPU iş yükünde ~%30-50 azalma
- **Kaldırma Güvenliği:** Doğrulama Gerekli (tasarım kararı)
- **Yeniden Kullanım Kapsamı:** Modül geneli

---

### F13: `my-notes.txt` — Repo'da Kişisel Not Dosyası
- **Kategori:** Dead Code / Repo Hijyen
- **Şiddet:** Düşük
- **Etki:** Repo temizliği
- **Kanıt:** `my-notes.txt` — kişisel todo notu, repo'da commit edilmiş
- **Önerilen düzeltme:** `.gitignore`'a ekle veya sil
- **Kaldırma Güvenliği:** Güvenli
- **Yeniden Kullanım Kapsamı:** Proje geneli

---

### F14: Stack Icon'larda `unoptimized` Koşullu Kullanım
- **Kategori:** Network
- **Şiddet:** Düşük
- **Etki:** Görsel boyutu
- **Kanıt:** `stack.tsx:68,84` — `unoptimized={item.icon.endsWith('.svg')}`
- **Neden verimsiz:** SVG'ler zaten optimize edilmemeli (doğru) ama `.png` olanlar (Neon gibi) Next.js optimizasyonundan geçiyor. Problem yok ama tüm ikonlar SVG'ye çevrilirse `unoptimized` koşulu sadeleşir.
- **Önerilen düzeltme:** Neon ikonunu SVG'ye çevir, tüm stack ikonlarını uniform tut
- **Kaldırma Güvenliği:** Güvenli
- **Yeniden Kullanım Kapsamı:** Yerel dosya

---

## 3) Hızlı Kazanımlar (Önce Yap)

| # | Düzeltme | Süre | Etki |
|---|---------|------|------|
| 1 | Preloader `[theme]` → `[]` dependency düzelt | 1 dk | Kritik UX |
| 2 | HangingProfile'a IntersectionObserver ekle | 10 dk | Yüksek CPU |
| 3 | CustomCursor render'daki `window.matchMedia` kaldır | 5 dk | Hydration fix |
| 4 | next.config.ts'e image formats ekle | 2 dk | Orta perf |
| 5 | `my-notes.txt` → .gitignore | 1 dk | Repo hijyen |
| 6 | `deepMerge`'i utils.ts'e taşı | 3 dk | Maintainability |

---

## 4) Derin Optimizasyonlar (Sonra Yap)

1. **ShineButton bileşeni oluştur** — Tüm shine-effect butonları tek bir bileşene topla. ~5 dosyada değişiklik.
2. **BlurReveal `once` stratejisi** — Tasarım kararı vererek `once: true` veya configurable prop ekle.
3. **useMediaQuery SSR-safe refactor** — `useSyncExternalStore` veya CSS-only responsive layout.
4. **Build-time markdown pre-processing** — Veri büyürse, JSON'ları build sırasında parse et.
5. **Static metadata per-locale** — `generateMetadata` ile locale-bazlı SEO title/description.

---

## 5) Doğrulama Planı

### Benchmark'lar
- **Lighthouse:** Mevcut skoru kaydet, değişikliklerden sonra karşılaştır (Performance, LCP, CLS, FID)
- **React DevTools Profiler:** BlurReveal, Navbar, Hero render sayılarını ölç
- **Chrome Performance tab:** HangingProfile düzeltmesi öncesi/sonrası CPU timeline karşılaştır

### Profiling Stratejisi
1. `React.Profiler` wrap ile Hero, Projects, Roadmap render sürelerini ölç
2. Chrome DevTools → Performance → rAF callback süreleri (HangingProfile, InteractiveParticles)
3. Network tab → Image loading waterfall (priority eklenmesi öncesi/sonrası)

### Doğruluk Testleri
- Tema değişikliğinde preloader'ın TEKRAR gösterilmediğini doğrula
- HangingProfile'ın viewport'a girince düzgün animate ettiğini doğrula
- Tüm sayfalarda hydration warning olmadığını konsol ile doğrula
- Mobil ve desktop'ta layout doğruluğunu kontrol et

---

## 6) Örnek Düzeltme Snippet'leri

### F1: Preloader Fix
```diff
// preloader.tsx
  useEffect(() => {
      setIsLoading(true);
      const timer = setTimeout(() => {
          setIsLoading(false);
          document.body.style.overflow = "";
      }, 1200);
      document.body.style.overflow = "hidden";
      return () => {
          clearTimeout(timer);
          document.body.style.overflow = "";
      };
- }, [theme]);
+ }, []);
```

### F2: HangingProfile IntersectionObserver
```diff
// hanging-profile.tsx
  useEffect(() => {
      let animationFrameId: number;
+     let isVisible = false;
+
+     const observer = new IntersectionObserver(
+       ([entry]) => {
+         isVisible = entry.isIntersecting;
+         if (isVisible && !animationFrameId) {
+           animationFrameId = requestAnimationFrame(updatePhysics);
+         }
+       },
+       { threshold: 0 }
+     );
+     if (containerRef.current) observer.observe(containerRef.current);

      const updatePhysics = (time: number) => {
+         if (!isVisible) { animationFrameId = 0; return; }
          // ... existing physics ...
          animationFrameId = requestAnimationFrame(updatePhysics);
      };

      animationFrameId = requestAnimationFrame(updatePhysics);
-     return () => cancelAnimationFrame(animationFrameId);
+     return () => {
+         cancelAnimationFrame(animationFrameId);
+         observer.disconnect();
+     };
  }, []);
```

### F3: CustomCursor Fix
```diff
// custom-cursor.tsx — render kısmı
- if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
-     return null;
- }
  // isMounted zaten touch cihaz kontrolünü useEffect'te yapıyor
  // useEffect'teki early return yeterli, render'da tekrar kontrol gereksiz
```

### F10: next.config.ts
```diff
- const nextConfig: NextConfig = {};
+ const nextConfig: NextConfig = {
+   images: {
+     formats: ['image/avif', 'image/webp'],
+   },
+ };
```

---

# GÜVENLİK DENETİMİ

### SECURITY AUDIT: Kintarowwwards Portfolio

**Risk Değerlendirmesi:** Düşük (Statik portfolyo, backend yok, kullanıcı girişi yok)

#### **Bulgular:**

* **Kişisel Veri İfşası** (Şiddet: Orta)
  * **Konum:** `contents/shared.json:4`
  * **Saldırı:** E-posta adresi (`mustafw42@gmail.com`) kaynak kodda ve public repo'da açıkça mevcut. Spam botları repo'yu tarayarak bu adresi toplayabilir.
  * **Düzeltme:** Bu bir portfolyo sitesi olduğu için bilinçli bir karar olabilir. Ancak phone alanı "Not added yet." olarak bırakılmış — gerçek numara eklenirse dikkatli olunmalı.

* **`dangerouslySetInnerHTML` Yok — İyi** (Gözlem)
  * Markdown parser (`parseMarkdown`) kendi güvenli parser'ını kullanıyor, `dangerouslySetInnerHTML` yok. XSS riski minimal.

* **External Link `rel` Attribute'ları — İyi** (Gözlem)
  * Tüm `target="_blank"` linklerde `rel="noopener noreferrer"` doğru kullanılmış.

* **`suppressHydrationWarning` Kullanımı** (Şiddet: Düşük)
  * **Konum:** `app/[lang]/layout.tsx:47`
  * **Saldırı:** Doğrudan saldırı vektörü yok, ama bu attribute hydration hatalarını sessizce yutarak gizli sorunları maskeleyebilir.
  * **Düzeltme:** next-themes için standart bir pratik, kabul edilebilir. Ancak başka yerlerde kullanılmamalı.

* **Regex DoS (ReDoS) Riski — Minimal** (Gözlem)
  * `parseInline` regex'i `/\*{2}(.+?)\*{2}|\*(.+?)\*/g` lazy quantifier kullanıyor. Kısa dictionary string'lerinde ReDoS riski pratik olarak yok. Ancak kullanıcı girdisi alınırsa risk artar.

#### **Gözlemler:**
- Secret/credential ifşası yok — API key, token vs. bulunmadı
- Tüm veri statik JSON'dan geliyor, injection riski yok
- `server-only` paketi loaders.ts'de doğru kullanılmış — client bundle'a server kodu sızması engelleniyor
- Download script (`download-stack-icon.js`) remote URL'den dosya indiriyor — supply chain riski düşük ama sadece geliştirme ortamında çalışmalı
