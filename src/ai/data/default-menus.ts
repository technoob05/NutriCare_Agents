import { DailyMenuData, MenuItemData, WeeklyMenuData } from '@/ai/flows/generate-menu-from-preferences';

// --- Helper to create detailed menu items ---
// Note: Nutritional info and costs are estimates and may vary.
const createDetailedItem = (details: Partial<MenuItemData> & { name: string }): MenuItemData => ({
    name: `${details.name} (Mặc định)`,
    ingredients: details.ingredients ?? ["Nguyên liệu chưa được chỉ định"],
    preparation: details.preparation ?? "Hướng dẫn chế biến chưa được chỉ định.",
    estimatedCost: details.estimatedCost ?? "Không ước tính",
    calories: details.calories, // undefined if not provided
    protein: details.protein, // undefined if not provided
    carbs: details.carbs, // undefined if not provided
    fat: details.fat, // undefined if not provided
    healthBenefits: details.healthBenefits ?? [], // Empty array if not provided
});

// --- Default Menu Definitions ---

// 1. Standard Vietnamese Family Menu (Daily)
export const defaultStandardFamilyMenu: DailyMenuData & { description: string; keywords: string[] } = {
    description: "Thực đơn gia đình Việt Nam tiêu chuẩn, cân bằng dinh dưỡng.",
    keywords: ["gia đình", "tiêu chuẩn", "cân bằng", "thông thường", "hàng ngày", "truyền thống"],
    breakfast: [
        createDetailedItem({
            name: "Phở Bò",
            ingredients: ["Bánh phở", "Thịt bò (nạm, tái)", "Hành tây", "Hành lá", "Gia vị phở", "Rau thơm (ngò gai, húng quế)"],
            preparation: "Trần bánh phở. Xếp thịt bò, hành tây, hành lá vào tô. Chan nước dùng nóng hổi. Ăn kèm rau thơm.",
            estimatedCost: "40k-60k",
            calories: 450, protein: 30, carbs: 50, fat: 15,
            healthBenefits: ["Cung cấp protein", "Giàu năng lượng"]
        })
    ],
    lunch: [
        createDetailedItem({ name: "Cơm trắng", ingredients: ["Gạo"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "5k", calories: 200, carbs: 45 }),
        createDetailedItem({
            name: "Thịt Kho Tàu",
            ingredients: ["Thịt ba chỉ", "Trứng vịt", "Nước dừa", "Nước màu", "Tỏi", "Hành", "Gia vị"],
            preparation: "Ướp thịt. Rán sơ thịt. Kho thịt với nước dừa, trứng và gia vị đến khi mềm và thấm.",
            estimatedCost: "50k-70k",
            calories: 400, protein: 25, carbs: 10, fat: 30,
            healthBenefits: ["Nguồn protein và chất béo"]
        }),
        createDetailedItem({
            name: "Canh Chua Cá Lóc",
            ingredients: ["Cá lóc", "Thơm (dứa)", "Cà chua", "Giá đỗ", "Bạc hà (dọc mùng)", "Me", "Rau thơm (ngò om, ngò gai)", "Gia vị"],
            preparation: "Nấu nước dùng với me, thơm, cà chua. Cho cá vào nấu chín. Thêm giá, bạc hà. Nêm nếm gia vị. Thêm rau thơm.",
            estimatedCost: "40k-60k",
            calories: 250, protein: 20, carbs: 25, fat: 8,
            healthBenefits: ["Giàu vitamin từ rau củ", "Cung cấp Omega-3 (tùy cá)"]
        }),
        createDetailedItem({
            name: "Rau Muống Luộc",
            ingredients: ["Rau muống", "Muối"],
            preparation: "Nhặt và rửa sạch rau. Luộc rau trong nước sôi có ít muối.",
            estimatedCost: "10k",
            calories: 30, carbs: 5,
            healthBenefits: ["Giàu chất xơ", "Vitamin K"]
        }),
    ],
    dinner: [
         createDetailedItem({ name: "Cơm trắng", ingredients: ["Gạo"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "5k", calories: 200, carbs: 45 }),
        createDetailedItem({
            name: "Gà Chiên Nước Mắm",
            ingredients: ["Đùi gà hoặc cánh gà", "Tỏi", "Ớt", "Nước mắm", "Đường", "Bột chiên giòn (tùy chọn)"],
            preparation: "Chiên gà vàng giòn. Phi thơm tỏi ớt. Pha sốt nước mắm đường. Rim gà với sốt.",
            estimatedCost: "50k-70k",
            calories: 450, protein: 35, carbs: 15, fat: 25,
            healthBenefits: ["Nguồn protein"]
        }),
        createDetailedItem({
            name: "Canh Bí Đao Nấu Tôm",
            ingredients: ["Bí đao", "Tôm tươi", "Hành lá", "Gia vị"],
            preparation: "Gọt vỏ bí đao, cắt miếng. Xào sơ tôm. Cho nước vào nấu sôi, cho bí đao vào nấu chín mềm. Nêm gia vị, thêm hành lá.",
            estimatedCost: "30k-40k",
            calories: 150, protein: 15, carbs: 15, fat: 3,
            healthBenefits: ["Giải nhiệt", "Nhẹ bụng"]
        }),
        createDetailedItem({
            name: "Đậu Cove Xào Tỏi",
            ingredients: ["Đậu cove", "Tỏi", "Dầu ăn", "Gia vị"],
            preparation: "Tước xơ, cắt khúc đậu cove. Phi thơm tỏi. Cho đậu vào xào nhanh tay trên lửa lớn. Nêm gia vị.",
            estimatedCost: "15k",
            calories: 100, carbs: 10, fat: 6,
            healthBenefits: ["Chất xơ", "Vitamin"]
        }),
    ],
    snacks: [
        createDetailedItem({ name: "Trái cây theo mùa", ingredients: ["Chuối, Cam, Táo,..."], preparation: "Rửa sạch, ăn trực tiếp.", estimatedCost: "15k", calories: 80, carbs: 20, healthBenefits: ["Vitamin", "Chất xơ"] })
    ],
};

// 2. Simple Budget-Friendly Menu (Daily)
export const defaultBudgetMenu: DailyMenuData & { description: string; keywords: string[] } = {
    description: "Thực đơn tiết kiệm, nguyên liệu đơn giản, dễ nấu.",
    keywords: ["tiết kiệm", "rẻ", "ngân sách", "đơn giản", "sinh viên", "ít tiền", "bình dân"],
    breakfast: [
        createDetailedItem({
            name: "Xôi Lạc",
            ingredients: ["Gạo nếp", "Lạc (đậu phộng)", "Hành phi", "Muối"],
            preparation: "Ngâm nếp. Đồ xôi với lạc. Rắc muối và hành phi.",
            estimatedCost: "10k-15k",
            calories: 400, protein: 10, carbs: 80, fat: 5,
            healthBenefits: ["No lâu", "Giá rẻ"]
        })
    ],
    lunch: [
        createDetailedItem({ name: "Cơm trắng", ingredients: ["Gạo"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "5k", calories: 200, carbs: 45 }),
        createDetailedItem({
            name: "Trứng Chiên Hành Lá",
            ingredients: ["Trứng gà", "Hành lá", "Nước mắm", "Dầu ăn"],
            preparation: "Đánh tan trứng với hành lá, nước mắm. Chiên vàng đều hai mặt.",
            estimatedCost: "10k",
            calories: 180, protein: 12, carbs: 2, fat: 14,
            healthBenefits: ["Protein giá rẻ", "Nhanh gọn"]
        }),
        createDetailedItem({
            name: "Canh Rau Ngót Nấu Thịt Băm",
            ingredients: ["Rau ngót", "Thịt heo băm", "Hành khô", "Gia vị"],
            preparation: "Vò rau ngót. Phi thơm hành, xào thịt băm. Cho nước vào nấu sôi, cho rau ngót vào nấu chín tới. Nêm gia vị.",
            estimatedCost: "20k",
            calories: 120, protein: 10, carbs: 8, fat: 5,
            healthBenefits: ["Giàu sắt (rau ngót)", "Dễ ăn"]
        }),
    ],
    dinner: [
        createDetailedItem({ name: "Cơm trắng", ingredients: ["Gạo"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "5k", calories: 200, carbs: 45 }),
        createDetailedItem({
            name: "Đậu Phụ Sốt Cà Chua",
            ingredients: ["Đậu phụ", "Cà chua", "Hành lá", "Hành khô", "Gia vị"],
            preparation: "Rán vàng đậu phụ. Phi thơm hành, sốt cà chua nhuyễn. Cho đậu phụ vào rim cùng sốt cà chua. Nêm gia vị, thêm hành lá.",
            estimatedCost: "15k",
            calories: 250, protein: 15, carbs: 20, fat: 12,
            healthBenefits: ["Protein thực vật", "Lycopene từ cà chua"]
        }),
        createDetailedItem({
            name: "Rau Luộc Chấm Kho Quẹt",
            ingredients: ["Rau cải/bí/bầu...", "Tôm khô", "Thịt ba chỉ", "Nước mắm", "Đường", "Tiêu", "Hành khô", "Ớt"],
            preparation: "Luộc rau. Làm kho quẹt: Rang tôm khô, rán tóp mỡ, phi hành, pha nước mắm đường rim sệt lại, thêm tôm thịt, tiêu ớt.",
            estimatedCost: "25k",
            calories: 150, protein: 8, carbs: 10, fat: 8, // Chỉ tính phần rau luộc và ít kho quẹt
            healthBenefits: ["Chất xơ từ rau", "Đậm đà (kho quẹt)"]
        }),
    ],
    snacks: [
        createDetailedItem({ name: "Khoai Lang Luộc", ingredients: ["Khoai lang"], preparation: "Rửa sạch, luộc chín.", estimatedCost: "10k", calories: 150, carbs: 35, healthBenefits: ["Chất xơ", "Vitamin A"] })
    ],
};

// 3. Simple Vegetarian Menu (Daily)
export const defaultVegetarianMenu: DailyMenuData & { description: string; keywords: string[] } = {
    description: "Thực đơn chay đơn giản, đủ chất.",
    keywords: ["chay", "ăn chay", "không thịt", "rau củ", "thực vật", "thanh đạm"],
    breakfast: [
        createDetailedItem({
            name: "Bún Riêu Chay",
            ingredients: ["Bún", "Đậu phụ", "Cà chua", "Nấm", "Đậu hũ ky", "Me", "Rau sống", "Gia vị chay"],
            preparation: "Nấu nước dùng chay với cà chua, nấm, me. Làm riêu chay từ đậu phụ. Ăn bún với riêu, đậu hũ ky, rau sống.",
            estimatedCost: "30k-40k",
            calories: 350, protein: 18, carbs: 55, fat: 8,
            healthBenefits: ["Protein thực vật", "Giàu chất xơ"]
        })
    ],
    lunch: [
        createDetailedItem({ name: "Cơm gạo lứt", ingredients: ["Gạo lứt"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "10k", calories: 220, carbs: 48, healthBenefits: ["Chất xơ cao", "Carb phức tạp"] }),
        createDetailedItem({
            name: "Đậu Hũ Kho Nấm",
            ingredients: ["Đậu hũ", "Nấm (đông cô, rơm...)", "Nước tương", "Đường", "Hành boa rô", "Tiêu"],
            preparation: "Rán sơ đậu hũ. Kho đậu hũ với nấm, nước tương và gia vị đến khi thấm.",
            estimatedCost: "25k",
            calories: 280, protein: 16, carbs: 15, fat: 16,
            healthBenefits: ["Protein thực vật", "Umami từ nấm"]
        }),
        createDetailedItem({
            name: "Canh Chua Chay",
            ingredients: ["Thơm (dứa)", "Cà chua", "Giá đỗ", "Bạc hà", "Đậu bắp", "Me", "Nấm", "Đậu hũ", "Rau thơm", "Gia vị chay"],
            preparation: "Nấu nước dùng với me, thơm, cà chua, nấm. Thêm đậu hũ, rau củ vào nấu chín. Nêm nếm gia vị.",
            estimatedCost: "30k",
            calories: 150, protein: 8, carbs: 25, fat: 3,
            healthBenefits: ["Giàu vitamin", "Giải nhiệt"]
        }),
        createDetailedItem({
            name: "Salad Rau Củ",
            ingredients: ["Xà lách", "Dưa chuột", "Cà chua bi", "Bắp cải tím", "Dầu giấm hoặc sốt mè rang"],
            preparation: "Rửa sạch, cắt rau củ. Trộn đều với sốt.",
            estimatedCost: "20k",
            calories: 100, carbs: 15, fat: 4,
            healthBenefits: ["Vitamin", "Chất xơ", "Tươi mát"]
        }),
    ],
    dinner: [
        createDetailedItem({ name: "Cơm gạo lứt", ingredients: ["Gạo lứt"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "10k", calories: 220, carbs: 48 }),
        createDetailedItem({
            name: "Chả Giò Chay",
            ingredients: ["Bánh tráng", "Khoai môn", "Cà rốt", "Đậu xanh", "Miến", "Nấm mèo", "Hành boa rô", "Gia vị chay"],
            preparation: "Trộn nhân. Cuốn chả giò. Chiên vàng giòn.",
            estimatedCost: "35k",
            calories: 300, protein: 8, carbs: 40, fat: 12, // Cho 3-4 cuốn
            healthBenefits: ["Nhiều loại rau củ"]
        }),
        createDetailedItem({
            name: "Canh Rong Biển Đậu Hũ Non",
            ingredients: ["Rong biển khô", "Đậu hũ non", "Nấm kim châm", "Gừng", "Dầu mè", "Nước tương"],
            preparation: "Ngâm rong biển. Nấu nước dùng với gừng. Cho rong biển, đậu hũ, nấm vào nấu. Nêm gia vị, thêm dầu mè.",
            estimatedCost: "25k",
            calories: 100, protein: 6, carbs: 10, fat: 4,
            healthBenefits: ["Khoáng chất từ rong biển", "Nhẹ nhàng"]
        }),
        createDetailedItem({
            name: "Rau Cải Xào Nấm",
            ingredients: ["Cải ngọt/Cải thìa", "Nấm (đông cô, bào ngư...)", "Tỏi", "Dầu hào chay", "Gia vị"],
            preparation: "Phi thơm tỏi. Xào nấm trước. Cho rau cải vào xào nhanh tay. Nêm dầu hào chay, gia vị.",
            estimatedCost: "20k",
            calories: 120, carbs: 12, fat: 7,
            healthBenefits: ["Chất xơ", "Vitamin"]
        }),
    ],
    snacks: [
        createDetailedItem({ name: "Sữa chua và hạt", ingredients: ["Sữa chua không đường", "Hạt chia/óc chó/hạnh nhân"], preparation: "Trộn đều.", estimatedCost: "20k", calories: 180, protein: 8, carbs: 15, fat: 10, healthBenefits: ["Probiotic", "Chất béo tốt", "Protein"] })
    ],
};

// 4. High-Protein Menu for Gym-Goers (Daily)
export const defaultGymGoerMenu: DailyMenuData & { description: string; keywords: string[] } = {
    description: "Thực đơn giàu protein, hỗ trợ xây dựng cơ bắp cho người tập gym.",
    keywords: ["gym", "tập gym", "protein cao", "tăng cơ", "thể hình", "sức khỏe"],
    breakfast: [
        createDetailedItem({
            name: "Ức Gà Áp Chảo và Trứng Luộc",
            ingredients: ["Ức gà", "Trứng gà", "Rau xanh (bông cải xanh, xà lách)", "Dầu olive", "Gia vị"],
            preparation: "Luộc trứng. Áp chảo ức gà với ít dầu olive và gia vị. Ăn kèm rau xanh luộc hoặc sống.",
            estimatedCost: "45k",
            calories: 450, protein: 50, carbs: 10, fat: 20,
            healthBenefits: ["Protein nạc cao", "Phục hồi cơ"]
        })
    ],
    lunch: [
        createDetailedItem({ name: "Cơm gạo lứt", ingredients: ["Gạo lứt"], preparation: "Vo gạo, nấu cơm.", estimatedCost: "10k", calories: 220, carbs: 48, healthBenefits: ["Chất xơ", "Năng lượng bền bỉ"] }),
        createDetailedItem({
            name: "Bò Xào Lúc Lắc",
            ingredients: ["Thịt thăn bò", "Ớt chuông (xanh, đỏ)", "Hành tây", "Tỏi", "Nước tương", "Dầu hào", "Gia vị"],
            preparation: "Ướp bò. Xào bò nhanh tay trên lửa lớn. Xào rau củ. Trộn bò và rau củ lại, nêm nếm.",
            estimatedCost: "60k-80k",
            calories: 400, protein: 40, carbs: 20, fat: 18,
            healthBenefits: ["Giàu protein và sắt", "Vitamin từ rau củ"]
        }),
        createDetailedItem({
            name: "Canh Thịt Bò Nấu Dứa",
            ingredients: ["Thịt bò (thăn hoặc bắp)", "Dứa (thơm)", "Cà chua", "Hành lá", "Gia vị"],
            preparation: "Xào sơ thịt bò. Cho nước, dứa, cà chua vào nấu. Nấu đến khi thịt bò mềm. Nêm gia vị.",
            estimatedCost: "40k",
            calories: 200, protein: 25, carbs: 15, fat: 5,
            healthBenefits: ["Protein", "Enzyme từ dứa hỗ trợ tiêu hóa"]
        }),
    ],
    dinner: [
        createDetailedItem({ name: "Khoai lang nướng/luộc", ingredients: ["Khoai lang"], preparation: "Nướng hoặc luộc chín.", estimatedCost: "10k", calories: 150, carbs: 35, healthBenefits: ["Carb phức tạp", "Chất xơ"] }),
        createDetailedItem({
            name: "Cá Hồi Áp Chảo",
            ingredients: ["Phi lê cá hồi", "Măng tây", "Chanh", "Tỏi", "Dầu olive", "Muối", "Tiêu"],
            preparation: "Áp chảo cá hồi với ít dầu olive, muối, tiêu. Áp chảo hoặc luộc măng tây. Ăn kèm với chanh.",
            estimatedCost: "80k-100k",
            calories: 450, protein: 40, carbs: 8, fat: 28,
            healthBenefits: ["Omega-3 cao", "Protein chất lượng", "Vitamin (măng tây)"]
        }),
         createDetailedItem({
            name: "Salad Ức Gà",
            ingredients: ["Ức gà luộc/nướng xé sợi", "Xà lách", "Dưa chuột", "Cà chua bi", "Sốt mè rang hoặc dầu giấm"],
            preparation: "Trộn đều các nguyên liệu.",
            estimatedCost: "40k",
            calories: 300, protein: 35, carbs: 15, fat: 10,
            healthBenefits: ["Protein nạc", "Chất xơ", "Vitamin"]
        }),
    ],
    snacks: [
        createDetailedItem({ name: "Sữa chua Hy Lạp và Whey Protein", ingredients: ["Sữa chua Hy Lạp", "1 muỗng whey protein", "Trái cây (tùy chọn)"], preparation: "Trộn đều whey với sữa chua. Thêm trái cây nếu muốn.", estimatedCost: "35k", calories: 250, protein: 35, carbs: 15, fat: 5, healthBenefits: ["Protein cao", "Probiotic", "Hỗ trợ phục hồi cơ"] }),
        createDetailedItem({ name: "Các loại hạt", ingredients: ["Hạnh nhân, óc chó, hạt điều..."], preparation: "Ăn trực tiếp.", estimatedCost: "20k", calories: 200, protein: 7, carbs: 7, fat: 18, healthBenefits: ["Chất béo tốt", "Protein", "Chất xơ"] })
    ],
};


// --- List of Default Menus ---
export const allDefaultMenus = [
    defaultStandardFamilyMenu,
    defaultBudgetMenu,
    defaultVegetarianMenu,
    defaultGymGoerMenu, // Added new menu
    // Add more default menus here as needed
];

// --- Type for Default Menu with Metadata ---
// No changes needed here, it already supports DailyMenuData or WeeklyMenuData
export type DefaultMenuWithMetadata = (DailyMenuData | WeeklyMenuData) & {
    description: string;
    keywords: string[];
};
