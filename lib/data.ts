// 메뉴 데이터 타입 및 샘플 데이터

export interface MenuItem {
  id: string
  name: string
  category: string
  country: string
  image: string
  price: number
  calories: number
  protein: number
  carbs: number
  fat: number
  restaurantId: string
}

export interface MoodMode {
  id: string
  name: string
  icon: string
  description: string
  weights: {
    price: number
    nutrition: number
    delivery: number
  }
}

export const moodModes: MoodMode[] = [
  {
    id: "budget",
    name: "지갑 모드",
    icon: "💰",
    description: "가성비가 최고! 저렴하고 맛있는 메뉴",
    weights: { price: 80, nutrition: 10, delivery: 10 },
  },
  {
    id: "healthy",
    name: "득근 모드",
    icon: "💪",
    description: "단백질 높고 균형 잡힌 영양",
    weights: { price: 10, nutrition: 80, delivery: 10 },
  },
  {
    id: "quick",
    name: "간편 모드",
    icon: "⚡",
    description: "빠른 배달! 시간이 없을 때",
    weights: { price: 10, nutrition: 10, delivery: 80 },
  },
]

export interface Restaurant {
  id: string
  name: string
  category: string
  image: string
  deliveryTime: number // 분 단위
  deliveryFee: number
  minOrder: number
}

export const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "헬시밀 키친",
    category: "샐러드/건강식",
    image: "/healthy-salad-restaurant-logo.jpg",
    deliveryTime: 25,
    deliveryFee: 2000,
    minOrder: 12000,
  },
  {
    id: "r2",
    name: "정든 한식당",
    category: "한식",
    image: "/korean-traditional-restaurant-logo.jpg",
    deliveryTime: 30,
    deliveryFee: 3000,
    minOrder: 10000,
  },
  {
    id: "r3",
    name: "포케포케",
    category: "포케/샐러드",
    image: "/poke-bowl-restaurant-logo.jpg",
    deliveryTime: 20,
    deliveryFee: 2500,
    minOrder: 15000,
  },
  {
    id: "r4",
    name: "마라홍",
    category: "중식",
    image: "/chinese-malatang-restaurant-logo.jpg",
    deliveryTime: 35,
    deliveryFee: 2000,
    minOrder: 13000,
  },
  {
    id: "r5",
    name: "버거킹",
    category: "패스트푸드",
    image: "/burger-fast-food-restaurant-logo.jpg",
    deliveryTime: 20,
    deliveryFee: 2500,
    minOrder: 8000,
  },
  {
    id: "r6",
    name: "동경규동",
    category: "일식",
    image: "/japanese-gyudon-restaurant-logo.jpg",
    deliveryTime: 25,
    deliveryFee: 2000,
    minOrder: 9000,
  },
  {
    id: "r7",
    name: "요거트팩토리",
    category: "디저트/건강식",
    image: "/yogurt-dessert-cafe-logo.jpg",
    deliveryTime: 15,
    deliveryFee: 1500,
    minOrder: 8000,
  },
]

export const menuItems: MenuItem[] = [
  {
    id: "1",
    name: "닭가슴살 샐러드",
    category: "샐러드",
    country: "한식",
    image: "/chicken-breast-salad-healthy-food.jpg",
    price: 9900,
    calories: 320,
    protein: 35,
    carbs: 15,
    fat: 12,
    restaurantId: "r1",
  },
  {
    id: "2",
    name: "제육볶음 정식",
    category: "한식",
    country: "한식",
    image: "/korean-spicy-pork-stir-fry-with-rice.jpg",
    price: 8500,
    calories: 650,
    protein: 28,
    carbs: 75,
    fat: 25,
    restaurantId: "r2",
  },
  {
    id: "3",
    name: "연어 포케볼",
    category: "양식",
    country: "양식",
    image: "/salmon-poke-bowl-fresh-healthy.jpg",
    price: 13500,
    calories: 420,
    protein: 32,
    carbs: 45,
    fat: 15,
    restaurantId: "r3",
  },
  {
    id: "4",
    name: "마라탕",
    category: "중식",
    country: "중식",
    image: "/spicy-chinese-malatang-soup.jpg",
    price: 11000,
    calories: 580,
    protein: 22,
    carbs: 55,
    fat: 30,
    restaurantId: "r4",
  },
  {
    id: "5",
    name: "치킨 버거 세트",
    category: "패스트푸드",
    country: "양식",
    image: "/crispy-chicken-burger-set-meal.jpg",
    price: 7500,
    calories: 850,
    protein: 35,
    carbs: 85,
    fat: 40,
    restaurantId: "r5",
  },
  {
    id: "6",
    name: "김치찌개",
    category: "한식",
    country: "한식",
    image: "/korean-kimchi-stew-traditional.jpg",
    price: 7000,
    calories: 380,
    protein: 18,
    carbs: 35,
    fat: 18,
    restaurantId: "r2",
  },
  {
    id: "7",
    name: "규동",
    category: "일식",
    country: "일식",
    image: "/japanese-beef-bowl-gyudon.jpg",
    price: 8000,
    calories: 550,
    protein: 25,
    carbs: 65,
    fat: 20,
    restaurantId: "r6",
  },
  {
    id: "8",
    name: "그릭 요거트 볼",
    category: "디저트",
    country: "양식",
    image: "/greek-yogurt-bowl-with-fruits-granola.jpg",
    price: 6500,
    calories: 280,
    protein: 15,
    carbs: 35,
    fat: 8,
    restaurantId: "r7",
  },
]

export interface FoodRecord {
  id: string
  date: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  menuItem: MenuItem
  photo?: string
  note?: string
}

export const sampleFoodRecords: FoodRecord[] = [
  {
    id: "1",
    date: "2026-01-14",
    mealType: "lunch",
    menuItem: menuItems[1],
    note: "오늘 점심은 맛있었다!",
  },
  {
    id: "2",
    date: "2026-01-13",
    mealType: "dinner",
    menuItem: menuItems[3],
  },
  {
    id: "3",
    date: "2026-01-13",
    mealType: "lunch",
    menuItem: menuItems[0],
    note: "운동 후 먹기 좋았음",
  },
  {
    id: "4",
    date: "2026-01-12",
    mealType: "dinner",
    menuItem: menuItems[2],
  },
  {
    id: "5",
    date: "2026-01-12",
    mealType: "lunch",
    menuItem: menuItems[6],
  },
]

export function getRestaurantById(id: string): Restaurant | undefined {
  return restaurants.find((r) => r.id === id)
}
