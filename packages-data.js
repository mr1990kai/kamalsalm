/* الباقات والأسعار: عدّل هنا فقط، وتتحدث في صفحة الباقات وصفحات المشاريع تلقائيًا */
var PACKAGES=[
 {id:'landing',price:40,days:{ar:'التسليم خلال 2 إلى 3 أيام',en:'Delivered in 2–3 days'},
  name:{ar:'صفحة هبوط',en:'Landing Page'},sub:{ar:'لمنتج واحد وحملة مباشرة',en:'For one product and a direct campaign'},
  items:{ar:['تصميم صفحة بيع لمنتج واحد','متجاوبة مع الجوال','نموذج طلب مناسب للدفع عند الاستلام','جاهزة للإعلانات وربط البيكسل'],
         en:['Sales page design for one product','Mobile responsive','Order form suited to cash on delivery','Ad-ready, pixel connected']}},
 {id:'starter',price:55,days:{ar:'التسليم خلال 4 أيام',en:'Delivered in 4 days'},
  name:{ar:'متجر أساسي',en:'Starter Store'},sub:{ar:'انطلاقة نظيفة لمتجرك',en:'A clean start for your store'},
  items:{ar:['متجر جاهز حتى 10 منتجات','تنظيم الأقسام والإعدادات','ربط الدومين','تصميم متجاوب بهوية لونية واضحة'],
         en:['Ready store with up to 10 products','Collections and settings set up','Domain connection','Responsive design with a clear colour identity']}},
 {id:'pro',price:79,days:{ar:'التسليم خلال 4 إلى 5 أيام',en:'Delivered in 4–5 days'},pop:true,
  name:{ar:'متجر احترافي',en:'Pro Store'},sub:{ar:'متجر كامل مع صفحة هبوط وتتبع',en:'Full store with a landing page and tracking'},
  items:{ar:['متجر حتى 30 منتجًا','صفحة هبوط لمنتج','بانرات وصور المتجر','ربط Meta Pixel وTikTok Pixel','إعداد SEO أساسي','ربط الدومين'],
         en:['Store with up to 30 products','One product landing page','Store banners and graphics','Meta and TikTok Pixel setup','Basic SEO setup','Domain connection']}},
 {id:'premium',price:99,days:{ar:'التسليم خلال 5 إلى 7 أيام',en:'Delivered in 5–7 days'},
  name:{ar:'متجر متكامل',en:'Premium Store'},sub:{ar:'كل ما تحتاجه من الفكرة إلى الإطلاق',en:'Everything from idea to launch'},
  items:{ar:['متجر حتى 50 منتجًا','شعار وهوية بصرية','صفحتا هبوط','تتبع إعلاني كامل (Pixel وConversion API)','جلسة شرح لإدارة المتجر','دعم 30 يومًا بعد التسليم'],
         en:['Store with up to 50 products','Logo and visual identity','Two landing pages','Full ad tracking (Pixel and Conversion API)','A walkthrough session on managing the store','30 days of support after delivery']}}
];
