/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from './types';

// Helper to calculate dynamic dates relative to today
const getFutureDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod_washing_motor",
    barcode: "6221001234001",
    name: "موتور غسالة يونيفرسال 7 كيلو إيطالي (Washing Machine Motor 7Kg)",
    category: "قطع غيار غسالات",
    costPrice: 450.00,
    sellingPrice: 680.00,
    quantity: 12,
    safetyStock: 3,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_washing_belt_1270",
    barcode: "6221001234002",
    name: "سير غسالة فول أوتوماتيك مقاس 1270 الألماني (Washing Machine Belt 1270)",
    category: "قطع غيار غسالات",
    costPrice: 35.00,
    sellingPrice: 65.00,
    quantity: 120,
    safetyStock: 15,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_washing_pump",
    barcode: "6221001234003",
    name: "طلمبة طرد مياه غسالة زانوسي أصلي (Zanussi Washing Machine Pump)",
    category: "قطع غيار غسالات",
    costPrice: 90.00,
    sellingPrice: 160.00,
    quantity: 25,
    safetyStock: 5,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_fridge_thermostat_2",
    barcode: "6221001234004",
    name: "ترموستات ثلاجة إيديال ديفروست 2 طرف رانكو (Ideal Defrost Thermostat 2-Pin)",
    category: "قطع غيار ثلاجات",
    costPrice: 65.00,
    sellingPrice: 110.00,
    quantity: 40,
    safetyStock: 8,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_fridge_fan",
    barcode: "6221001234005",
    name: "مروحة تبريد كويل توشيبا نوفروست الكوري (Toshiba No-Frost Cooling Fan)",
    category: "قطع غيار ثلاجات",
    costPrice: 110.00,
    sellingPrice: 185.00,
    quantity: 18,
    safetyStock: 4,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_cooker_knob_kiriazi",
    barcode: "6221001234006",
    name: "مفتاح بوتاجاز كريازي فلات أسود أصلي (Kiriazi Cooker Knob Black)",
    category: "قطع غيار بوتاجازات وأفران",
    costPrice: 8.00,
    sellingPrice: 20.00,
    quantity: 95,
    safetyStock: 20,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_blender_motor_universal",
    barcode: "6221001234007",
    name: "موتور خلاط يونيفرسال 400 وات بالجلدة (Universal Blender Motor 400W)",
    category: "قطع غيار خلاطات ومطاحن",
    costPrice: 140.00,
    sellingPrice: 220.00,
    quantity: 30,
    safetyStock: 6,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_blender_jar_moulinex",
    barcode: "6221001234008",
    name: "شفشق كبة خلاط مولينكس كامل بالسكينة (Moulinex Blender Jar Complete)",
    category: "قطع غيار خلاطات ومطاحن",
    costPrice: 55.00,
    sellingPrice: 95.00,
    quantity: 45,
    safetyStock: 10,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_blender_clutch_gear",
    barcode: "6221001234009",
    name: "جلدة وجير ترأس خلاط توشيبا وسن يمين (Toshiba Blender Coupling Gear)",
    category: "قطع غيار خلاطات ومطاحن",
    costPrice: 10.00,
    sellingPrice: 25.00,
    quantity: 200,
    safetyStock: 30,
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_heater_element_olympic",
    barcode: "6221001234010",
    name: "هيتر سخان أولمبيك 1550 وات النحاس الأصلي (Olympic Copper Heater 1550W)",
    category: "سخانات وأدوات كهربائية",
    costPrice: 125.00,
    sellingPrice: 195.00,
    quantity: 15,
    safetyStock: 3,
    updatedAt: new Date().toISOString()
  }
];

export const CATEGORIES = [
  "جميع الأقسام",
  "قطع غيار غسالات",
  "قطع غيار ثلاجات",
  "قطع غيار خلاطات ومطاحن",
  "قطع غيار بوتاجازات وأفران",
  "سخانات وأدوات كهربائية",
  "أكسسوارات ومستلزمات عامة"
];
