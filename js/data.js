// ============================================
// RoyalSpl Florist - 商品數據庫
// 20個示例商品，含五維交叉標籤
// ============================================

const products = [
    {
        id: 1,
        name_zh: '緋芍集',
        name_en: 'Crimson Peony Bouquet',
        price: 688,
        emoji: '🌸',
        category: '招牌系列',
        description: '精選緋紅色芍藥，搭配綠葉，象徵富貴吉祥，適合各種重要場合。',
        tags: ['戀愛', '生日', '芍藥', '經典風', 'HK$300-600', '即日配送', '可加賀卡'],
        scentNotes: ['古典玫瑰', '荔枝', '粉紅胡椒'],
        styleSpectrum: 70, // 0=浪漫, 100=雅緻
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '緋紅芍藥 × 9',
            origin: '荷蘭 · 阿姆斯特丹',
            size: '高 45cm × 寬 35cm'
        }
    },
    {
        id: 2,
        name_zh: '晨露玫瑰',
        name_en: 'Morning Dew Roses',
        price: 488,
        emoji: '🌹',
        category: '玫瑰花',
        description: '12支精選紅玫瑰，清晨採摘，新鮮直送，經典浪漫之選。',
        tags: ['戀愛', '情人節', '玫瑰', '經典風', 'HK$300-600', '即日配送', '可加賀卡'],
        scentNotes: ['大馬士革玫瑰', '晨露'],
        styleSpectrum: 30,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '紅玫瑰 × 12',
            origin: '肯亞 · 奈瓦沙',
            size: '高 40cm × 寬 30cm'
        }
    },
    {
        id: 3,
        name_zh: '月光百合',
        name_en: 'Moonlight Lilies',
        price: 528,
        emoji: '🌷',
        category: '百合花',
        description: '優雅白色百合，清新脫俗，適合各種場合，純潔高貴。',
        tags: ['婚禮', '探病', '百合', '韓式', 'HK$300-600', '香港全境配送', '可加賀卡'],
        scentNotes: ['白百合', '茉莉'],
        styleSpectrum: 80,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '白百合 × 6',
            origin: '日本 · 鹿兒島',
            size: '高 50cm × 寬 30cm'
        }
    },
    {
        id: 4,
        name_zh: '向日葵花束',
        name_en: 'Sunflower Bouquet',
        price: 398,
        emoji: '🌻',
        category: '向日葵',
        description: '陽光燦爛的向日葵，充滿活力與希望，溫暖人心。',
        tags: ['生日', '畢業季', '向日葵', '經典風', 'HK$300內', '即日配送'],
        scentNotes: ['向日葵', '青草'],
        styleSpectrum: 20,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '向日葵 × 8',
            origin: '中國 · 雲南',
            size: '高 40cm × 寬 35cm'
        }
    },
    {
        id: 5,
        name_zh: '鬱金香花束',
        name_en: 'Tulip Bouquet',
        price: 458,
        emoji: '💐',
        category: '鬱金香',
        description: '多彩鬱金香，優雅大方，荷蘭進口，春日氣息。',
        tags: ['戀愛', '生日', '鬱金香', '韓式', 'HK$300-600', '香港全境配送'],
        scentNotes: ['鬱金香', '清新'],
        styleSpectrum: 60,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '鬱金香 × 15',
            origin: '荷蘭 · 阿姆斯特丹',
            size: '高 35cm × 寬 30cm'
        }
    },
    {
        id: 6,
        name_zh: '蘭花盆栽',
        name_en: 'Orchid Plant',
        price: 888,
        emoji: '🪴',
        category: '蘭花',
        description: '高貴蘭花盆栽，適合商務送禮，典雅大方。',
        tags: ['商務送禮', '開張', '蘭花', '經典風', 'HK$800+', '香港全境配送'],
        scentNotes: ['蘭花', '木質'],
        styleSpectrum: 90,
        stock: '現貨',
        deliveryDays: 2,
        specs: {
            flowers: '蝴蝶蘭 × 1',
            origin: '台灣 · 台南',
            size: '高 60cm × 寬 40cm'
        }
    },
    {
        id: 7,
        name_zh: '粉紅玫瑰',
        name_en: 'Pink Roses',
        price: 428,
        emoji: '🌸',
        category: '玫瑰花',
        description: '12支粉玫瑰，溫柔浪漫，表達愛意的最佳選擇。',
        tags: ['戀愛', '情人節', '玫瑰', '韓式', 'HK$300-600', '即日配送', '可加賀卡'],
        scentNotes: ['粉玫瑰', '蜜桃'],
        styleSpectrum: 40,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '粉玫瑰 × 12',
            origin: '肯亞 · 奈瓦沙',
            size: '高 40cm × 寬 30cm'
        }
    },
    {
        id: 8,
        name_zh: '日式禪意花禮',
        name_en: 'Japanese Zen Floral Gift',
        price: 688,
        emoji: '🎋',
        category: '日式花禮',
        description: '日式極簡風格，禪意十足，適合商務送禮與家居裝飾。',
        tags: ['商務送禮', '喬遷', '進口鮮花', '日式極簡', 'HK$300-600', '香港全境配送'],
        scentNotes: ['松木', '苔蘚'],
        styleSpectrum: 85,
        stock: '預訂',
        deliveryDays: 3,
        specs: {
            flowers: '進口花材混合',
            origin: '日本 · 京都',
            size: '高 45cm × 寬 30cm'
        }
    },
    {
        id: 9,
        name_zh: '永生花盒',
        name_en: 'Preserved Flower Box',
        price: 1280,
        emoji: '🎁',
        category: '永生花',
        description: '精緻永生花盒，可保存2-3年，適合紀念日與重要場合。',
        tags: ['紀念日', '婚禮', '玫瑰', '永生花', 'HK$1200+', '香港全境配送', '可加賀卡'],
        scentNotes: ['玫瑰', '薰衣草'],
        styleSpectrum: 75,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '永生玫瑰 × 9',
            origin: '日本 · 東京',
            size: '高 20cm × 寬 25cm'
        }
    },
    {
        id: 10,
        name_zh: '康乃馨花束',
        name_en: 'Carnation Bouquet',
        price: 298,
        emoji: '🌺',
        category: '康乃馨',
        description: '溫馨康乃馨，適合送給母親，表達感恩之情。',
        tags: ['母親節', '探病', '康乃馨', '經典風', 'HK$300內', '即日配送', '可加賀卡'],
        scentNotes: ['康乃馨', '丁香'],
        styleSpectrum: 25,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '康乃馨 × 18',
            origin: '中國 · 昆明',
            size: '高 35cm × 寬 30cm'
        }
    },
    {
        id: 11,
        name_zh: '法式田園花籃',
        name_en: 'French Provincial Basket',
        price: 788,
        emoji: '🧺',
        category: '法式田園',
        description: '法式田園風格花籃，浪漫隨性，充滿鄉村氣息。',
        tags: ['生日', '喬遷', '進口鮮花', '法式田園', 'HK$800+', '香港全境配送'],
        scentNotes: ['薰衣草', '雛菊'],
        styleSpectrum: 45,
        stock: '預訂',
        deliveryDays: 3,
        specs: {
            flowers: '混合花材',
            origin: '法國 · 普羅旺斯',
            size: '高 40cm × 寬 35cm'
        }
    },
    {
        id: 12,
        name_zh: '牡丹花束',
        name_en: 'Peony Bouquet',
        price: 888,
        emoji: '💮',
        category: '芍藥牡丹',
        description: '富貴牡丹，花中之王，適合重要節慶與商務場合。',
        tags: ['商務送禮', '開張', '芍藥', '經典風', 'HK$800+', '香港全境配送'],
        scentNotes: ['牡丹', '檀香'],
        styleSpectrum: 80,
        stock: '現貨',
        deliveryDays: 2,
        specs: {
            flowers: '牡丹 × 8',
            origin: '中國 · 洛陽',
            size: '高 50cm × 寬 40cm'
        }
    },
    {
        id: 13,
        name_zh: '滿天星花束',
        name_en: "Baby's Breath Bouquet",
        price: 268,
        emoji: '✨',
        category: '滿天星',
        description: '清新滿天星，簡約浪漫，適合日常送禮。',
        tags: ['戀愛', '生日', '滿天星', '韓式', 'HK$300內', '即日配送'],
        scentNotes: ['滿天星', '清新'],
        styleSpectrum: 50,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '滿天星 × 10',
            origin: '中國 · 雲南',
            size: '高 35cm × 寬 25cm'
        }
    },
    {
        id: 14,
        name_zh: '聖誕花環',
        name_en: 'Christmas Wreath',
        price: 688,
        emoji: '🎄',
        category: '節慶花禮',
        description: '節日限定聖誕花環，增添節日氛圍。',
        tags: ['聖誕節', '節慶', '進口鮮花', '經典風', 'HK$300-600', '香港全境配送'],
        scentNotes: ['松針', '肉桂'],
        styleSpectrum: 65,
        stock: '預訂',
        deliveryDays: 5,
        specs: {
            flowers: '松枝 + 裝飾',
            origin: '加拿大 · 溫哥華',
            size: '直徑 40cm'
        }
    },
    {
        id: 15,
        name_zh: '荷花禪意花藝',
        name_en: 'Lotus Zen Arrangement',
        price: 988,
        emoji: '🪷',
        category: '荷花',
        description: '清雅荷花，禪意十足，適合靜心與冥想空間。',
        tags: ['商務送禮', '開張', '荷花', '日式極簡', 'HK$800+', '香港全境配送'],
        scentNotes: ['荷花', '蓮葉'],
        styleSpectrum: 95,
        stock: '預訂',
        deliveryDays: 4,
        specs: {
            flowers: '荷花 × 3',
            origin: '中國 · 杭州',
            size: '高 55cm × 寬 30cm'
        }
    },
    {
        id: 16,
        name_zh: '畢業花束',
        name_en: 'Graduation Bouquet',
        price: 388,
        emoji: '🎓',
        category: '畢業花禮',
        description: '慶祝畢業的繽紛花束，祝福前程似錦。',
        tags: ['畢業季', '生日', '向日葵', '韓式', 'HK$300-600', '即日配送', '可加賀卡'],
        scentNotes: ['向日葵', '雛菊'],
        styleSpectrum: 35,
        stock: '現貨',
        deliveryDays: 1,
        specs: {
            flowers: '向日葵 + 雛菊',
            origin: '中國 · 雲南',
            size: '高 40cm × 寬 30cm'
        }
    },
    {
        id: 17,
        name_zh: '婚禮手捧花',
        name_en: 'Wedding Bouquet',
        price: 1280,
        emoji: '💐',
        category: '婚禮花禮',
        description: '精緻婚禮手捧花，為您的大日子增添浪漫。',
        tags: ['婚禮', '紀念日', '玫瑰', '經典風', 'HK$1200+', '香港全境配送'],
        scentNotes: ['白玫瑰', '鈴蘭'],
        styleSpectrum: 70,
        stock: '預訂',
        deliveryDays: 7,
        specs: {
            flowers: '白玫瑰 + 鈴蘭',
            origin: '荷蘭 · 阿姆斯特丹',
            size: '高 30cm × 寬 25cm'
        }
    },
    {
        id: 18,
        name_zh: '中秋花禮',
        name_en: 'Mid-Autumn Floral Gift',
        price: 588,
        emoji: '🏮',
        category: '節慶花禮',
        description: '中秋佳節限定花禮，搭配月餅更顯心意。',
        tags: ['中秋節', '節慶', '進口鮮花', '經典風', 'HK$300-600', '香港全境配送'],
        scentNotes: ['桂花', '菊花'],
        styleSpectrum: 55,
        stock: '現貨',
        deliveryDays: 2,
        specs: {
            flowers: '菊花 + 桂花',
            origin: '中國 · 廣州',
            size: '高 40cm × 寬 30cm'
        }
    },
    {
        id: 19,
        name_zh: '進口藍玫瑰',
        name_en: 'Imported Blue Roses',
        price: 1580,
        emoji: '💙',
        category: '進口鮮花',
        description: '稀有進口藍玫瑰，神秘高貴，限量發售。',
        tags: ['戀愛', '紀念日', '玫瑰', '進口鮮花', 'HK$1200+', '香港全境配送', '可加賀卡'],
        scentNotes: ['藍玫瑰', '海洋'],
        styleSpectrum: 85,
        stock: '預訂',
        deliveryDays: 5,
        specs: {
            flowers: '藍玫瑰 × 12',
            origin: '日本 · 東京',
            size: '高 45cm × 寬 35cm'
        }
    },
    {
        id: 20,
        name_zh: '企業周年花籃',
        name_en: 'Corporate Anniversary Basket',
        price: 1880,
        emoji: '🏢',
        category: '商務花禮',
        description: '企業周年慶典花籃，氣派大方，彰顯企業形象。',
        tags: ['商務送禮', '企業周年', '進口鮮花', '經典風', 'HK$1200+', '香港全境配送'],
        scentNotes: ['百合', '蘭花'],
        styleSpectrum: 90,
        stock: '預訂',
        deliveryDays: 5,
        specs: {
            flowers: '混合高級花材',
            origin: '多國進口',
            size: '高 80cm × 寬 60cm'
        }
    }
];

// 交叉標籤維度定義
const tagDimensions = {
    '場景用途': ['戀愛', '生日', '情人節', '母親節', '中秋節', '清明節', '畢業季', '聖誕節', '婚禮', '紀念日', '探病', '開張', '喬遷', '商務送禮', '企業周年', '探親'],
    '核心花材': ['玫瑰', '鬱金香', '芍藥', '荷花', '百合', '康乃馨', '向日葵', '滿天星', '蘭花', '牡丹', '進口鮮花'],
    '設計風格': ['經典風', '韓式', '日式極簡', '法式田園', '永生花'],
    '價格區間': ['HK$300內', 'HK$300-600', 'HK$800+', 'HK$1200+'],
    '附加服務': ['即日配送', '可加賀卡', '香港全境配送']
};

// 獲取所有標籤
function getAllTags() {
    const allTags = new Set();
    products.forEach(product => {
        product.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
}

// 根據ID獲取商品
function getProductById(id) {
    return products.find(p => p.id === parseInt(id));
}

// 根據標籤篩選商品
function getProductsByTag(tag) {
    if (!tag || tag === 'all') return products;
    return products.filter(p => p.tags.includes(tag));
}

// 根據多個標籤篩選（AND邏輯）
function getProductsByTags(tags) {
    if (!tags || tags.length === 0) return products;
    return products.filter(p => 
        tags.every(tag => p.tags.includes(tag))
    );
}