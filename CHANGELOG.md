# Changelog · سجل التغييرات

All notable changes to **AURALIS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Planned · مخطط له
- 🎥 صفحة `webinar-pro.html` (بث احترافي متقدم)
- 🏥 صفحة `hospital.html` (مستشفى ومرافق صحية)
- 🏨 صفحة `hotel-lobby.html` (ردهة فندق)
- 🎨 نظام Themes (فاتح/داكن)
- 🔊 تشغيل صوتي فعلي (Web Audio API)
- 📊 تصدير DXF / CAD
- 🌍 لغة ثالثة (فرنسي / تركي)

---

## [2.0.0] — 2026-01 · الإصدار الرئيسي الثاني

### Added · أضيف
- 🎤 `meeting.html` — قاعة اجتماعات مع PTZ Camera Tracking
- 🎓 `lecture-hall.html` — قاعة محاضرات جامعية بـ 140 مقعد
- 🎥 `webinar.html` — استوديو بث احترافي (EBU)
- 📞 `call-center.html` — مركز اتصال بـ 20 وكيل
- 🕌 `mosque-outdoor.html` — مسجد بأربع مآذن
- 🏟️ `stadium-filled.html` — ملعب رياضي كامل
- ⛲ `park.html` — حديقة عامة
- 🛣️ `street.html` — شارع حضري بطول 200م
- 🏖️ `beach.html` — شاطئ ومنتجع ساحلي
- 💦 `waterpark.html` — مدينة مائية
- 🏁 `race.html` — حلبة سباق دولية
- ⛳ `golf.html` — ملعب غولف 9 حفر
- 🦁 `zoo.html` — حديقة حيوان بـ 10 موائل
- ⬜ `empty.html` — لوحة فارغة للتصميم الحر
- 📄 `README.md` — توثيق كامل ثنائي اللغة
- 📜 `LICENSE` — رخصة MIT
- 🎨 `favicon.svg` — أيقونة موحدة
- 📱 `manifest.json` — PWA قابل للتثبيت
- 🚀 `sitemap.xml` — تحسين محركات البحث

### Changed · تغيّر
- 🔄 **index.html** — 39 بيئة (من 25)
- 🔄 إصلاح رابط `stadium-field.html` → `stadium-filled.html`
- 🔄 تحديث `CATALOG` بترقيم واضح
- 🔄 تحسين أداء Heatmap (100×100 → 70×70 على القاعات الصغيرة)

### Fixed · أُصلح
- 🐛 `constDev.userData.dev` → `dragDev.userData.dev` (amusement.html)
- 🐛 `classList.remove('good d','warn')` → `classList.remove('good','warn')`
- 🐛 `mx >= drag75` → `mx >= 75`
- 🐛 إضافة `M.concrete()` المفقود

---

## [1.0.0] — 2026-01 · الإصدار الأول

### Added · أضيف
- 🏠 `index.html` — القائمة الرئيسية
- 🕌 `mosque-indoor.html` — مسجد داخلي
- ⛪ `church.html` — كنيسة
- 🎭 `theater.html` — مسرح
- 🎬 `cinema.html` — سينما
- 🏟️ `stadium.html` — ملعب
- 🍽️ `restaurant.html` — مطعم
- 🏫 `classroom.html` — فصل دراسي
- 🎙️ `studio.html` — استوديو
- 📢 `conference.html` — قاعة مؤتمرات
- 💍 `wedding.html` — قاعة أفراح
- 🏢 `office.html` — مكتب
- 🛍️ `shop.html` — متجر
- 🎪 `festival.html` — مهرجان
- 🏙️ `plaza.html` — ساحة عامة
- 🏖️ `resort.html` — منتجع
- 🚉 `train.html` — محطة قطار
- ✈️ `airport.html` — مطار
- 🏫 `school-yard.html` — ساحة مدرسة
- 🅿️ `parking.html` — موقف سيارات
- 🚌 `bus.html` — محطة حافلات
- ⛵ `marina.html` — مارينا
- 🎾 `tennis.html` — ملعب تنس
- 🏟️ `arena.html` — حلبة
- 🎢 `amusement.html` — مدينة ألعاب
- 🏠 `room.html` — غرفة متعددة
- 🔥 `firebase.js` — إعداد Firebase

---

## Legend · الرموز

- 🆕 Added — إضافات جديدة
- 🔄 Changed — تعديلات
- 🐛 Fixed — إصلاحات
- 🗑️ Removed — محذوفات
- 🔒 Security — أمان
- 📝 Docs — توثيق
