import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@qurankids.com' },
    update: {},
    create: {
      email: 'admin@qurankids.com',
      passwordHash: await bcrypt.hash('admin123456', 12),
      role: 'admin',
    },
  })

  // Badges
  const badges = [
    { name: 'Pembaca Perdana', description: 'Selesaikan kisah pertamamu', requirementType: 'stories_completed' as const, requirementValue: 1 },
    { name: 'Api Semangat', description: 'Streak 7 hari berturut-turut', requirementType: 'streak_days' as const, requirementValue: 7 },
    { name: 'Pencari Ilmu', description: 'Kumpulkan 500 poin', requirementType: 'points' as const, requirementValue: 500 },
    { name: 'Khatam Perdana', description: 'Selesaikan 10 kisah', requirementType: 'stories_completed' as const, requirementValue: 10 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }

  // ─── SAHABAT NABI (10 kisah) ───────────────────────────────────────────────
  // Unsplash cover maps per slug
  const covers: Record<string, string> = {
    'kisah-abu-bakar-ash-shiddiq':    'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400&h=300&fit=crop',
    'kisah-umar-bin-khattab':         'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400&h=300&fit=crop',
    'kisah-utsman-bin-affan':         'https://images.unsplash.com/photo-1585036156171-384164a8c675?w=400&h=300&fit=crop',
    'kisah-ali-bin-abi-thalib':       'https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=400&h=300&fit=crop',
    'kisah-bilal-bin-rabah':          'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=400&h=300&fit=crop',
    'kisah-salman-al-farisi':         'https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=400&h=300&fit=crop',
    'kisah-khadijah-binti-khuwailid': 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=300&fit=crop',
    'kisah-aisyah-binti-abu-bakar':   'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=400&h=300&fit=crop',
    'kisah-hamzah-bin-abdul-muthalib':'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
    'kisah-zaid-bin-tsabit':          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
    'kisah-nabi-adam-as':             'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&h=300&fit=crop',
    'kisah-nabi-nuh-as':              'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=300&fit=crop',
    'kisah-nabi-ibrahim-as':          'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=400&h=300&fit=crop',
    'kisah-nabi-musa-as':             'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400&h=300&fit=crop',
    'kisah-nabi-yusuf-as':            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    'kisah-nabi-sulaiman-as':         'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&h=300&fit=crop',
    'kisah-nabi-isa-as':              'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
    'kisah-ashabul-kahfi':            'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&h=300&fit=crop',
    'kisah-nabi-yunus-as':            'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&h=300&fit=crop',
    'kisah-nabi-ayyub-as':            'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
    'pentingnya-berkata-jujur':       'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=400&h=300&fit=crop',
    'hormat-kepada-orang-tua':        'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=300&fit=crop',
    'menolong-sesama':                'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop',
    'sabar-dalam-menghadapi-cobaan':  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    'menjaga-kebersihan':             'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop',
    'berbagi-dengan-sesama':          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
    'menjaga-lisan-dari-perkataan-buruk': 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=300&fit=crop',
    'rajin-belajar-dan-menuntut-ilmu':'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
    'persahabatan-yang-tulus':        'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=400&h=300&fit=crop',
    'syukur-atas-nikmat-allah':       'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
  }

  const sahabatStories = [
    {
      title: 'Kisah Abu Bakar Ash-Shiddiq',
      slug: 'kisah-abu-bakar-ash-shiddiq',
      pages: [
        { pageNumber: 1, textArabic: 'أبو بكر الصديق رضي الله عنه', textLatin: 'Abu Bakr Ash-Shiddiq radhiyallahu anhu', textTranslation: 'Abu Bakar Ash-Shiddiq adalah sahabat terdekat Rasulullah SAW dan orang pertama yang masuk Islam dari kalangan orang dewasa.' },
        { pageNumber: 2, textTranslation: 'Beliau dikenal sebagai Ash-Shiddiq, artinya "Yang Membenarkan", karena selalu membenarkan setiap wahyu yang disampaikan Rasulullah SAW.' },
        { pageNumber: 3, textTranslation: 'Ketika Rasulullah SAW berhijrah ke Madinah, Abu Bakar setia menemani beliau. Mereka bersembunyi di Gua Tsur selama tiga hari.' },
      ],
    },
    {
      title: 'Kisah Umar bin Khattab',
      slug: 'kisah-umar-bin-khattab',
      pages: [
        { pageNumber: 1, textArabic: 'عمر بن الخطاب رضي الله عنه', textLatin: 'Umar bin Khattab radhiyallahu anhu', textTranslation: 'Umar bin Khattab dikenal sebagai pemimpin yang adil dan tegas. Sebelum masuk Islam, beliau adalah musuh terbesar kaum muslimin.' },
        { pageNumber: 2, textTranslation: 'Suatu hari Umar mendengar saudaranya membaca Al-Qur\'an. Hatinya tergerak dan ia pun memeluk Islam. Rasulullah SAW sangat gembira dengan keislaman Umar.' },
        { pageNumber: 3, textTranslation: 'Umar menjadi khalifah kedua dan dikenal dengan julukan Al-Faruq, yang artinya "Pembeda antara kebenaran dan kebatilan".' },
      ],
    },
    {
      title: 'Kisah Utsman bin Affan',
      slug: 'kisah-utsman-bin-affan',
      pages: [
        { pageNumber: 1, textArabic: 'عثمان بن عفان رضي الله عنه', textLatin: 'Utsman bin Affan radhiyallahu anhu', textTranslation: 'Utsman bin Affan dikenal sebagai sahabat yang sangat dermawan dan pemalu. Beliau menikah dengan dua putri Rasulullah SAW sehingga dijuluki Dzun Nurain (pemilik dua cahaya).' },
        { pageNumber: 2, textTranslation: 'Ketika umat Islam membutuhkan air, Utsman membeli sumur Rumah dari seorang Yahudi dan menghadiahkannya untuk seluruh kaum muslimin.' },
        { pageNumber: 3, textTranslation: 'Utsman juga mendanai perluasan Masjid Nabawi dan mempersiapkan pasukan Islam dengan hartanya sendiri di masa sulit.' },
      ],
    },
    {
      title: 'Kisah Ali bin Abi Thalib',
      slug: 'kisah-ali-bin-abi-thalib',
      pages: [
        { pageNumber: 1, textArabic: 'علي بن أبي طالب رضي الله عنه', textLatin: 'Ali bin Abi Thalib radhiyallahu anhu', textTranslation: 'Ali bin Abi Thalib adalah sepupu sekaligus menantu Rasulullah SAW. Beliau masuk Islam sejak kecil dan dikenal sebagai orang yang sangat cerdas dan berani.' },
        { pageNumber: 2, textTranslation: 'Pada malam hijrah, Ali rela tidur di tempat tidur Rasulullah SAW untuk mengecoh kaum Quraisy yang hendak membunuh Nabi.' },
        { pageNumber: 3, textTranslation: 'Ali dikenal dengan ilmunya yang luas. Rasulullah SAW bersabda: "Aku adalah kota ilmu dan Ali adalah pintunya."' },
      ],
    },
    {
      title: 'Kisah Bilal bin Rabah',
      slug: 'kisah-bilal-bin-rabah',
      pages: [
        { pageNumber: 1, textArabic: 'بلال بن رباح رضي الله عنه', textLatin: 'Bilal bin Rabah radhiyallahu anhu', textTranslation: 'Bilal bin Rabah adalah seorang budak dari Habasyah (Ethiopia). Meski disiksa majikannya karena memeluk Islam, ia tetap teguh dengan ucapan "Ahad... Ahad..." (Allah Maha Esa).' },
        { pageNumber: 2, textTranslation: 'Abu Bakar Ash-Shiddiq akhirnya membeli dan membebaskan Bilal dari perbudakan. Bilal kemudian menjadi muadzin pertama dalam sejarah Islam.' },
        { pageNumber: 3, textTranslation: 'Suara adzan Bilal yang merdu menggema di Madinah. Rasulullah SAW sangat menyayangi Bilal dan menyebutnya sebagai penghuni surga.' },
      ],
    },
    {
      title: 'Kisah Salman Al-Farisi',
      slug: 'kisah-salman-al-farisi',
      pages: [
        { pageNumber: 1, textArabic: 'سلمان الفارسي رضي الله عنه', textLatin: 'Salman Al-Farisi radhiyallahu anhu', textTranslation: 'Salman Al-Farisi berasal dari Persia. Ia melakukan perjalanan panjang mencari kebenaran sejati, hingga akhirnya bertemu Rasulullah SAW di Madinah dan memeluk Islam.' },
        { pageNumber: 2, textTranslation: 'Ketika perang Khandaq, Salman mengusulkan ide membuat parit (khandaq) sebagai pertahanan. Ide cemerlang ini berhasil menyelamatkan kaum muslimin.' },
        { pageNumber: 3, textTranslation: 'Rasulullah SAW bersabda tentang Salman: "Salman adalah bagian dari keluargaku (Ahlul Bait)." Ini adalah penghargaan tertinggi bagi Salman.' },
      ],
    },
    {
      title: 'Kisah Khadijah binti Khuwailid',
      slug: 'kisah-khadijah-binti-khuwailid',
      pages: [
        { pageNumber: 1, textArabic: 'خديجة بنت خويلد رضي الله عنها', textLatin: 'Khadijah binti Khuwailid radhiyallahu anha', textTranslation: 'Khadijah adalah wanita pertama yang masuk Islam dan istri pertama Rasulullah SAW. Ia adalah seorang pengusaha sukses yang mulia akhlaknya.' },
        { pageNumber: 2, textTranslation: 'Ketika Rasulullah SAW ketakutan setelah menerima wahyu pertama, Khadijah langsung memeluknya dan berkata: "Allah tidak akan menghinakanmu. Kamu selalu menyambung silaturahmi dan menolong orang lemah."' },
        { pageNumber: 3, textTranslation: 'Khadijah menginfakkan seluruh hartanya untuk perjuangan Islam. Allah SWT memberi salam kepadanya melalui Malaikat Jibril dan menjanjikan rumah di surga untuknya.' },
      ],
    },
    {
      title: 'Kisah Aisyah binti Abu Bakar',
      slug: 'kisah-aisyah-binti-abu-bakar',
      pages: [
        { pageNumber: 1, textArabic: 'عائشة بنت أبي بكر رضي الله عنها', textLatin: 'Aisyah binti Abi Bakr radhiyallahu anha', textTranslation: 'Aisyah adalah putri Abu Bakar Ash-Shiddiq dan istri Rasulullah SAW. Beliau dikenal sebagai wanita paling cerdas di zamannya.' },
        { pageNumber: 2, textTranslation: 'Aisyah meriwayatkan ribuan hadits Rasulullah SAW. Para sahabat sering bertanya kepadanya tentang ibadah dan kehidupan Rasulullah SAW.' },
        { pageNumber: 3, textTranslation: 'Rasulullah SAW bersabda: "Ambillah setengah agama kalian dari Aisyah." Ini menunjukkan betapa pentingnya peran Aisyah dalam menjaga ajaran Islam.' },
      ],
    },
    {
      title: 'Kisah Hamzah bin Abdul Muthalib',
      slug: 'kisah-hamzah-bin-abdul-muthalib',
      pages: [
        { pageNumber: 1, textArabic: 'حمزة بن عبد المطلب رضي الله عنه', textLatin: 'Hamzah bin Abdul Muthalib radhiyallahu anhu', textTranslation: 'Hamzah adalah paman Rasulullah SAW sekaligus saudara sepersusuan. Ia adalah pejuang Islam yang sangat berani dan kuat, dijuluki "Singa Allah".' },
        { pageNumber: 2, textTranslation: 'Hamzah masuk Islam ketika mendengar kabar bahwa Abu Jahal telah menyakiti Rasulullah SAW. Dengan berani ia mendatangi Abu Jahal dan menyatakan keislamannya.' },
        { pageNumber: 3, textTranslation: 'Hamzah gugur sebagai syuhada dalam Perang Uhud. Rasulullah SAW sangat berduka dan menyebut Hamzah sebagai "Penghulu para syuhada".' },
      ],
    },
    {
      title: 'Kisah Zaid bin Tsabit',
      slug: 'kisah-zaid-bin-tsabit',
      pages: [
        { pageNumber: 1, textArabic: 'زيد بن ثابت رضي الله عنه', textLatin: 'Zaid bin Tsabit radhiyallahu anhu', textTranslation: 'Zaid bin Tsabit adalah sekretaris wahyu Rasulullah SAW. Sejak kecil ia sangat cerdas dan mampu menghafal Al-Qur\'an dengan cepat.' },
        { pageNumber: 2, textTranslation: 'Rasulullah SAW memerintahkan Zaid untuk mempelajari bahasa Ibrani dan Suryani. Dalam waktu singkat, Zaid berhasil menguasai kedua bahasa tersebut.' },
        { pageNumber: 3, textTranslation: 'Zaid memimpin tim pengumpulan Al-Qur\'an menjadi satu mushaf pada masa Khalifah Abu Bakar. Jasanya sangat besar bagi kelestarian Al-Qur\'an.' },
      ],
    },
  ]

  // ─── KISAH QURAN (10 kisah) ────────────────────────────────────────────────
  const quranStories = [
    {
      title: 'Kisah Nabi Adam AS',
      slug: 'kisah-nabi-adam-as',
      pages: [
        { pageNumber: 1, textArabic: 'وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا', textLatin: 'Wa\'allama Aadam al-asmaa\'a kullaha', textTranslation: 'Allah menciptakan Adam AS sebagai manusia pertama di bumi. Allah mengajarkan kepada Adam nama-nama semua benda yang ada.' },
        { pageNumber: 2, textTranslation: 'Allah memerintahkan para malaikat untuk bersujud kepada Adam. Semua malaikat bersujud, kecuali iblis yang sombong dan menolak perintah Allah.' },
        { pageNumber: 3, textTranslation: 'Adam dan Hawa ditempatkan di surga. Namun karena tergoda iblis, mereka memakan buah terlarang. Allah menurunkan mereka ke bumi sebagai ujian.' },
      ],
    },
    {
      title: 'Kisah Nabi Nuh AS',
      slug: 'kisah-nabi-nuh-as',
      pages: [
        { pageNumber: 1, textArabic: 'وَاصْنَعِ الْفُلْكَ بِأَعْيُنِنَا وَوَحْيِنَا', textLatin: 'Wasna\'il fulka bi a\'yuninaa wa wahyinaa', textTranslation: 'Nabi Nuh AS berdakwah kepada kaumnya selama 950 tahun, namun hanya sedikit yang beriman. Allah memerintahkan Nuh untuk membangun kapal besar.' },
        { pageNumber: 2, textTranslation: 'Ketika kapal selesai, Allah menurunkan hujan deras dan banjir besar menenggelamkan seluruh bumi. Nuh membawa keluarganya dan sepasang setiap hewan ke dalam kapal.' },
        { pageNumber: 3, textTranslation: 'Setelah banjir surut, kapal Nuh berlabuh di Gunung Judi. Nuh dan para pengikutnya selamat, dan bumi pun dihuni kembali oleh keturunan mereka.' },
      ],
    },
    {
      title: 'Kisah Nabi Ibrahim AS',
      slug: 'kisah-nabi-ibrahim-as',
      pages: [
        { pageNumber: 1, textArabic: 'إِنَّ إِبْرَاهِيمَ كَانَ أُمَّةً قَانِتًا لِّلَّهِ', textLatin: 'Inna Ibrahima kaana ummatan qanital lillah', textTranslation: 'Nabi Ibrahim AS adalah bapak para nabi. Sejak kecil, ia mempertanyakan mengapa kaumnya menyembah patung yang tidak bisa berbicara atau bergerak.' },
        { pageNumber: 2, textTranslation: 'Ibrahim menghancurkan patung-patung sesembahan kaumnya. Raja Namrud yang marah memerintahkan Ibrahim dibakar hidup-hidup dalam api yang besar.' },
        { pageNumber: 3, textTranslation: 'Allah berfirman: "Wahai api, jadilah dingin dan selamatkan Ibrahim!" Ajaib, api tidak membakar Ibrahim. Ia keluar dari api dengan selamat tanpa luka sedikit pun.' },
      ],
    },
    {
      title: 'Kisah Nabi Musa AS',
      slug: 'kisah-nabi-musa-as',
      pages: [
        { pageNumber: 1, textArabic: 'وَأَلْقِ عَصَاكَ ۚ فَلَمَّا رَآهَا تَهْتَزُّ كَأَنَّهَا جَانٌّ', textLatin: 'Wa alqi asaaka falamma ra\'aaha tahtazzu ka\'annaha jaann', textTranslation: 'Nabi Musa AS lahir di zaman Firaun yang zalim. Bayi Musa dihanyutkan ibunya di sungai Nil dan diselamatkan oleh keluarga Firaun sendiri.' },
        { pageNumber: 2, textTranslation: 'Allah berbicara langsung kepada Musa di Gunung Sinai dan mengutusnya ke Firaun. Tongkat Musa bisa berubah menjadi ular dan membelah lautan.' },
        { pageNumber: 3, textTranslation: 'Musa memimpin Bani Israel keluar dari perbudakan Mesir. Ketika dikejar Firaun, Allah membelah Laut Merah sehingga mereka bisa menyeberang dengan selamat.' },
      ],
    },
    {
      title: 'Kisah Nabi Yusuf AS',
      slug: 'kisah-nabi-yusuf-as',
      pages: [
        { pageNumber: 1, textArabic: 'إِذْ قَالَ يُوسُفُ لِأَبِيهِ يَا أَبَتِ إِنِّي رَأَيْتُ أَحَدَ عَشَرَ كَوْكَبًا', textLatin: 'Iz qala Yusufu li abiihi yaa abati inni ra\'aytu ahada \'asyara kawkabaa', textTranslation: 'Yusuf AS bermimpi melihat sebelas bintang, matahari, dan bulan bersujud kepadanya. Mimpi ini menandakan Yusuf akan menjadi pemimpin besar.' },
        { pageNumber: 2, textTranslation: 'Saudara-saudara Yusuf yang iri membuangnya ke dalam sumur. Yusuf kemudian dijual sebagai budak di Mesir. Meski melalui banyak cobaan, Yusuf tetap sabar dan jujur.' },
        { pageNumber: 3, textTranslation: 'Berkat kejujuran dan kecerdasannya, Yusuf diangkat menjadi menteri keuangan Mesir. Akhirnya ia bertemu kembali dengan ayah dan saudara-saudaranya dengan penuh kasih sayang.' },
      ],
    },
    {
      title: 'Kisah Nabi Sulaiman AS',
      slug: 'kisah-nabi-sulaiman-as',
      pages: [
        { pageNumber: 1, textArabic: 'وَوَرِثَ سُلَيْمَانُ دَاوُودَ وَقَالَ يَا أَيُّهَا النَّاسُ عُلِّمْنَا مَنطِقَ الطَّيْرِ', textLatin: 'Wa waritha Sulaimanu Dawuda wa qaala yaa ayyuhan naasu ullimna mantiqat thayr', textTranslation: 'Nabi Sulaiman AS dianugerahi Allah kemampuan luar biasa: bisa berbicara dengan hewan, menguasai angin, dan memimpin jin untuk membangun istana megah.' },
        { pageNumber: 2, textTranslation: 'Seekor semut pernah memperingatkan kawanannya saat pasukan Sulaiman hendak melintas. Sulaiman mendengar dan tersenyum kagum atas rasa saling peduli para semut.' },
        { pageNumber: 3, textTranslation: 'Ratu Balqis dari negeri Saba datang mengunjungi Sulaiman setelah mendengar kebijaksanaannya. Ia akhirnya memeluk Islam dan tunduk kepada Allah SWT.' },
      ],
    },
    {
      title: 'Kisah Nabi Isa AS',
      slug: 'kisah-nabi-isa-as',
      pages: [
        { pageNumber: 1, textArabic: 'إِنَّ مَثَلَ عِيسَىٰ عِندَ اللَّهِ كَمَثَلِ آدَمَ', textLatin: 'Inna matsala Isa \'indallahi kamatsali Adam', textTranslation: 'Nabi Isa AS lahir dari seorang ibu bernama Maryam tanpa ayah, sebagai mukjizat dari Allah SWT. Sejak bayi ia sudah bisa berbicara untuk membela ibunya.' },
        { pageNumber: 2, textTranslation: 'Isa AS dianugerahi banyak mukjizat: menyembuhkan orang buta sejak lahir, menyembuhkan penyakit kusta, dan menghidupkan orang mati atas izin Allah.' },
        { pageNumber: 3, textTranslation: 'Isa AS menyebarkan ajaran tauhid kepada Bani Israel. Allah menyelamatkannya dari rencana jahat musuh-musuhnya dan mengangkatnya ke langit.' },
      ],
    },
    {
      title: 'Kisah Ashabul Kahfi',
      slug: 'kisah-ashabul-kahfi',
      pages: [
        { pageNumber: 1, textArabic: 'أَمْ حَسِبْتَ أَنَّ أَصْحَابَ الْكَهْفِ وَالرَّقِيمِ كَانُوا مِنْ آيَاتِنَا عَجَبًا', textLatin: 'Am hasibta anna ashabal kahfi war raqiimi kaanu min aayatinaa ajabaa', textTranslation: 'Tujuh pemuda beriman melarikan diri dari raja yang zalim dan bersembunyi di sebuah gua. Mereka berdoa agar Allah melindungi mereka.' },
        { pageNumber: 2, textTranslation: 'Allah menidurkan mereka selama 309 tahun! Ketika mereka terbangun, mereka mengira hanya tidur semalam. Seekor anjing setia menemani mereka sepanjang waktu.' },
        { pageNumber: 3, textTranslation: 'Ketika salah satu pemuda turun ke kota untuk membeli makanan, ia kaget mendapati kerajaan zalim sudah lama tumbang dan Islam sudah tersebar. Kisah mereka menjadi bukti kekuasaan Allah.' },
      ],
    },
    {
      title: 'Kisah Nabi Yunus AS',
      slug: 'kisah-nabi-yunus-as',
      pages: [
        { pageNumber: 1, textArabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ', textLatin: 'Laa ilaaha illaa anta subhanaaka innii kuntu minadz dzaalimiin', textTranslation: 'Nabi Yunus AS pergi meninggalkan kaumnya sebelum mendapat izin Allah. Ia menaiki kapal yang diterjang badai dan diundi untuk dilempar ke laut.' },
        { pageNumber: 2, textTranslation: 'Yunus ditelan ikan paus yang besar. Di dalam perut ikan, ia bertaubat dan berdoa dengan penuh kerendahan hati kepada Allah SWT.' },
        { pageNumber: 3, textTranslation: 'Allah mengabulkan doanya. Ikan paus memuntahkan Yunus ke tepi pantai. Allah menyuruhnya kembali berdakwah dan kaumnya pun beriman.' },
      ],
    },
    {
      title: 'Kisah Nabi Ayyub AS',
      slug: 'kisah-nabi-ayyub-as',
      pages: [
        { pageNumber: 1, textArabic: 'وَأَيُّوبَ إِذْ نَادَىٰ رَبَّهُ أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ', textLatin: 'Wa Ayyuba iz naadaa rabbahu annii massaniadh dhurru wa anta arhamur raahimiin', textTranslation: 'Nabi Ayyub AS adalah seorang nabi yang kaya raya dan banyak anak. Allah mengujinya dengan penyakit parah yang menimpanya selama bertahun-tahun.' },
        { pageNumber: 2, textTranslation: 'Meski hartanya habis, anak-anaknya meninggal, dan tubuhnya sakit parah, Ayyub tetap bersabar dan tidak pernah mengeluh kepada Allah SWT.' },
        { pageNumber: 3, textTranslation: 'Allah mengabulkan doanya dan menyembuhkan penyakitnya. Harta dan keturunannya dikembalikan berlipat ganda. Kisah Ayyub menjadi teladan kesabaran terbaik sepanjang masa.' },
      ],
    },
  ]

  // ─── AKHLAQ (10 kisah) ────────────────────────────────────────────────────
  const akhlaqStories = [
    {
      title: 'Pentingnya Berkata Jujur',
      slug: 'pentingnya-berkata-jujur',
      pages: [
        { pageNumber: 1, textTranslation: 'Rasulullah SAW bersabda: "Hendaklah kalian selalu berlaku jujur, karena kejujuran membawa kepada kebaikan, dan kebaikan membawa ke surga."' },
        { pageNumber: 2, textTranslation: 'Suatu hari seorang anak berbohong kepada ibunya agar bisa bermain. Akibatnya, teman-temannya tidak mau bermain lagi dengannya karena tidak mempercayainya.' },
        { pageNumber: 3, textTranslation: 'Anak yang jujur selalu dipercaya oleh teman dan orang tuanya. Kejujuran adalah akhlak terpuji yang dicintai Allah dan semua orang.' },
      ],
    },
    {
      title: 'Hormat kepada Orang Tua',
      slug: 'hormat-kepada-orang-tua',
      pages: [
        { pageNumber: 1, textArabic: 'وَبِالْوَالِدَيْنِ إِحْسَانًا', textLatin: 'Wa bil waalidaini ihsaanaa', textTranslation: 'Allah memerintahkan kita untuk berbuat baik kepada orang tua. Ridha Allah ada pada ridha orang tua, dan murka Allah ada pada murka orang tua.' },
        { pageNumber: 2, textTranslation: 'Uwais Al-Qarni adalah pemuda yang sangat berbakti kepada ibunya yang sakit. Ia tidak bisa menemui Rasulullah SAW karena harus merawat sang ibu.' },
        { pageNumber: 3, textTranslation: 'Rasulullah SAW sangat memuji Uwais dan berpesan kepada sahabatnya untuk meminta doa dari Uwais. Bakti kepada orang tua adalah kunci kebahagiaan di dunia dan akhirat.' },
      ],
    },
    {
      title: 'Menolong Sesama',
      slug: 'menolong-sesama',
      pages: [
        { pageNumber: 1, textTranslation: 'Rasulullah SAW bersabda: "Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain." Islam mengajarkan kita untuk saling membantu dan peduli.' },
        { pageNumber: 2, textTranslation: 'Seorang anak melihat temannya kesulitan membawa tas berat. Tanpa diminta, ia langsung membantu temannya. Guru pun memuji kebaikannya di depan kelas.' },
        { pageNumber: 3, textTranslation: 'Setiap kebaikan yang kita lakukan akan dibalas oleh Allah dengan kebaikan yang lebih besar. Mulailah menolong orang lain dari hal-hal kecil di sekitar kita.' },
      ],
    },
    {
      title: 'Sabar dalam Menghadapi Cobaan',
      slug: 'sabar-dalam-menghadapi-cobaan',
      pages: [
        { pageNumber: 1, textArabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', textLatin: 'Innallaaha ma\'ash shaabiriin', textTranslation: 'Allah berfirman: "Sesungguhnya Allah bersama orang-orang yang sabar." Sabar adalah salah satu akhlak terbaik yang diajarkan Islam.' },
        { pageNumber: 2, textTranslation: 'Seorang anak gagal dalam ujian. Ia sedih, namun tidak putus asa. Ia belajar lebih giat dan meminta doa kepada orang tuanya.' },
        { pageNumber: 3, textTranslation: 'Pada ujian berikutnya, anak itu mendapat nilai terbaik di kelasnya. Kesabaran dan ketekunan selalu membuahkan hasil yang manis.' },
      ],
    },
    {
      title: 'Menjaga Kebersihan',
      slug: 'menjaga-kebersihan',
      pages: [
        { pageNumber: 1, textArabic: 'الطَّهُورُ شَطْرُ الْإِيمَانِ', textLatin: 'Ath thahuuru syathrul iimaan', textTranslation: 'Rasulullah SAW bersabda: "Kebersihan adalah sebagian dari iman." Islam sangat menganjurkan kita menjaga kebersihan diri, pakaian, dan lingkungan.' },
        { pageNumber: 2, textTranslation: 'Rasulullah SAW selalu menjaga kebersihan. Beliau rajin bersiwak (sikat gigi), mencuci tangan sebelum makan, dan menjaga kesucian pakaiannya.' },
        { pageNumber: 3, textTranslation: 'Rumah yang bersih, badan yang wangi, dan lingkungan yang rapi membuat hidup lebih nyaman. Kebersihan adalah cermin keimanan seorang muslim.' },
      ],
    },
    {
      title: 'Berbagi dengan Sesama',
      slug: 'berbagi-dengan-sesama',
      pages: [
        { pageNumber: 1, textTranslation: 'Sedekah adalah salah satu amalan terbaik dalam Islam. Rasulullah SAW sangat dermawan dan selalu berbagi dengan orang yang membutuhkan.' },
        { pageNumber: 2, textTranslation: 'Seorang anak memiliki banyak jajan. Ia melihat temannya tidak membawa bekal. Dengan senang hati, ia membagi jajanannya kepada temannya.' },
        { pageNumber: 3, textTranslation: 'Rasulullah SAW bersabda: "Harta tidak akan berkurang karena sedekah." Justru dengan berbagi, Allah akan menambah rezeki kita berlipat ganda.' },
      ],
    },
    {
      title: 'Menjaga Lisan dari Perkataan Buruk',
      slug: 'menjaga-lisan-dari-perkataan-buruk',
      pages: [
        { pageNumber: 1, textArabic: 'وَقُولُوا لِلنَّاسِ حُسْنًا', textLatin: 'Wa quuluu linnaasi husnaa', textTranslation: 'Allah berfirman: "Dan ucapkanlah kata-kata yang baik kepada manusia." Lisan yang baik adalah tanda akhlak yang mulia.' },
        { pageNumber: 2, textTranslation: 'Kata-kata yang menyakitkan bisa melukai hati seseorang lebih dalam dari luka fisik. Sebaliknya, kata-kata yang baik bisa membuat orang merasa senang dan bahagia.' },
        { pageNumber: 3, textTranslation: 'Biasakan mengucapkan salam, terima kasih, dan maaf. Tiga kata ajaib ini bisa menjaga persahabatan dan menyebarkan kebahagiaan di sekitar kita.' },
      ],
    },
    {
      title: 'Rajin Belajar dan Menuntut Ilmu',
      slug: 'rajin-belajar-dan-menuntut-ilmu',
      pages: [
        { pageNumber: 1, textArabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', textLatin: 'Iqra bismi rabbikal ladzii khalaq', textTranslation: 'Wahyu pertama yang diturunkan Allah adalah perintah membaca. Islam sangat menganjurkan umatnya untuk terus belajar dan menuntut ilmu.' },
        { pageNumber: 2, textTranslation: 'Rasulullah SAW bersabda: "Menuntut ilmu adalah wajib bagi setiap muslim." Para sahabat rela menempuh perjalanan jauh hanya untuk mendapatkan satu hadits.' },
        { pageNumber: 3, textTranslation: 'Ilmu adalah cahaya yang menerangi jalan hidup kita. Anak yang rajin belajar akan menjadi orang yang berguna bagi agama, keluarga, dan negaranya.' },
      ],
    },
    {
      title: 'Persahabatan yang Tulus',
      slug: 'persahabatan-yang-tulus',
      pages: [
        { pageNumber: 1, textTranslation: 'Rasulullah SAW bersabda: "Seseorang itu mengikuti agama teman dekatnya, maka hendaklah kalian melihat siapa yang dijadikan teman dekat." Pilihlah teman yang baik.' },
        { pageNumber: 2, textTranslation: 'Teman yang baik akan mengingatkan kita ketika berbuat salah, membantu kita saat susah, dan ikut senang saat kita bahagia. Ia bukan teman yang hanya ada saat senang.' },
        { pageNumber: 3, textTranslation: 'Persahabatan antara kaum Muhajirin dan Anshar adalah contoh terbaik. Kaum Anshar rela membagi harta dan rumah mereka kepada saudara-saudaranya yang hijrah.' },
      ],
    },
    {
      title: 'Syukur atas Nikmat Allah',
      slug: 'syukur-atas-nikmat-allah',
      pages: [
        { pageNumber: 1, textArabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ', textLatin: 'La\'in syakartum la\'aziidannakum', textTranslation: 'Allah berfirman: "Jika kalian bersyukur, pasti Aku akan menambah nikmat kalian." Syukur adalah kunci mendapatkan lebih banyak kebaikan dari Allah.' },
        { pageNumber: 2, textTranslation: 'Coba hitung nikmat Allah: mata untuk melihat, telinga untuk mendengar, kaki untuk berjalan, dan masih banyak lagi. Nikmat Allah tidak terhitung jumlahnya.' },
        { pageNumber: 3, textTranslation: 'Cara bersyukur adalah dengan mengucapkan Alhamdulillah, menggunakan nikmat untuk kebaikan, dan tidak mengeluh atas kekurangan kita. Anak yang bersyukur adalah anak yang bahagia.' },
      ],
    },
  ]

  // Upsert semua kisah
  const allStories = [
    ...sahabatStories.map(s => ({ ...s, category: 'sahabat_nabi' as const, difficultyLevel: 'easy' as const, isPremium: false, coverImageUrl: covers[s.slug] })),
    ...quranStories.map(s => ({ ...s, category: 'kisah_quran' as const, difficultyLevel: 'medium' as const, isPremium: false, coverImageUrl: covers[s.slug] })),
    ...akhlaqStories.map(s => ({ ...s, category: 'akhlaq' as const, difficultyLevel: 'easy' as const, isPremium: false, coverImageUrl: covers[s.slug] })),
  ]

  for (const story of allStories) {
    const { pages, ...storyData } = story
    const existing = await prisma.story.findUnique({ where: { slug: storyData.slug } })

    if (!existing) {
      await prisma.story.create({
        data: {
          ...storyData,
          isPublished: true,
          totalPages: pages.length,
          pages: { create: pages },
        },
      })
      console.log(`✓ Created: ${storyData.title}`)
    } else {
      console.log(`- Skipped (exists): ${storyData.title}`)
    }
  }

  console.log('\nSeed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
