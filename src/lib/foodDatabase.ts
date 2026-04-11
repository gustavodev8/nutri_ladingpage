export interface FoodItem {
  id: string;
  name: string;
  category: string;
  kcal: number;    // per 100g
  protein: number; // per 100g (g)
  carbs: number;   // per 100g (g)
  fat: number;     // per 100g (g)
  fiber?: number;  // per 100g (g)
}

export const FOOD_CATEGORIES = [
  "Frutas",
  "Cereais e derivados",
  "Pães, bolos e biscoitos",
  "Carnes e aves",
  "Peixes e frutos do mar",
  "Ovos e laticínios",
  "Leguminosas",
  "Verduras e legumes",
  "Oleaginosas e sementes",
  "Óleos e gorduras",
  "Doces e sobremesas",
  "Bebidas e sucos",
  "Suplementos",
  "Personalizado",
] as const;

export const BUILT_IN_FOODS: FoodItem[] = [
  // Frutas
  { id: "fr-01", name: "Abacate", category: "Frutas", kcal: 96, protein: 1.2, carbs: 6.0, fat: 8.4, fiber: 6.3 },
  { id: "fr-02", name: "Abacaxi", category: "Frutas", kcal: 48, protein: 0.9, carbs: 11.5, fat: 0.1, fiber: 1.0 },
  { id: "fr-03", name: "Acerola", category: "Frutas", kcal: 32, protein: 0.8, carbs: 7.5, fat: 0.2, fiber: 1.5 },
  { id: "fr-04", name: "Açaí (polpa)", category: "Frutas", kcal: 58, protein: 0.8, carbs: 6.7, fat: 3.0, fiber: 2.6 },
  { id: "fr-05", name: "Ameixa", category: "Frutas", kcal: 55, protein: 0.7, carbs: 13.7, fat: 0.1, fiber: 1.4 },
  { id: "fr-06", name: "Banana prata", category: "Frutas", kcal: 98, protein: 1.3, carbs: 26.0, fat: 0.1, fiber: 2.0 },
  { id: "fr-07", name: "Banana maçã", category: "Frutas", kcal: 87, protein: 1.1, carbs: 22.8, fat: 0.1, fiber: 1.9 },
  { id: "fr-08", name: "Banana nanica", category: "Frutas", kcal: 92, protein: 1.2, carbs: 23.9, fat: 0.1, fiber: 1.9 },
  { id: "fr-09", name: "Caju", category: "Frutas", kcal: 43, protein: 1.3, carbs: 9.8, fat: 0.5, fiber: 1.7 },
  { id: "fr-10", name: "Caqui", category: "Frutas", kcal: 70, protein: 0.5, carbs: 18.3, fat: 0.2, fiber: 2.1 },
  { id: "fr-11", name: "Cereja", category: "Frutas", kcal: 46, protein: 0.9, carbs: 11.5, fat: 0.1, fiber: 1.3 },
  { id: "fr-12", name: "Coco fruto", category: "Frutas", kcal: 355, protein: 3.4, carbs: 7.2, fat: 34.6, fiber: 5.4 },
  { id: "fr-13", name: "Figo", category: "Frutas", kcal: 64, protein: 1.3, carbs: 15.2, fat: 0.3, fiber: 2.1 },
  { id: "fr-14", name: "Goiaba vermelha", category: "Frutas", kcal: 54, protein: 2.3, carbs: 12.5, fat: 0.5, fiber: 6.0 },
  { id: "fr-15", name: "Goiaba branca", category: "Frutas", kcal: 50, protein: 1.8, carbs: 12.0, fat: 0.4, fiber: 5.5 },
  { id: "fr-16", name: "Graviola", category: "Frutas", kcal: 62, protein: 1.0, carbs: 14.6, fat: 0.3, fiber: 2.0 },
  { id: "fr-17", name: "Jaca", category: "Frutas", kcal: 95, protein: 1.6, carbs: 22.4, fat: 0.3, fiber: 1.6 },
  { id: "fr-18", name: "Kiwi", category: "Frutas", kcal: 44, protein: 1.0, carbs: 10.7, fat: 0.6, fiber: 2.0 },
  { id: "fr-19", name: "Laranja pera", category: "Frutas", kcal: 37, protein: 1.0, carbs: 8.9, fat: 0.1, fiber: 0.8 },
  { id: "fr-20", name: "Laranja lima", category: "Frutas", kcal: 36, protein: 0.8, carbs: 8.9, fat: 0.1, fiber: 0.8 },
  { id: "fr-21", name: "Limão tahiti", category: "Frutas", kcal: 32, protein: 1.0, carbs: 7.5, fat: 0.3, fiber: 2.6 },
  { id: "fr-22", name: "Maçã fuji", category: "Frutas", kcal: 56, protein: 0.3, carbs: 15.3, fat: 0.2, fiber: 1.3 },
  { id: "fr-23", name: "Mamão formosa", category: "Frutas", kcal: 40, protein: 0.5, carbs: 10.4, fat: 0.1, fiber: 1.8 },
  { id: "fr-24", name: "Mamão papaia", category: "Frutas", kcal: 45, protein: 0.7, carbs: 11.4, fat: 0.2, fiber: 1.8 },
  { id: "fr-25", name: "Manga tommy", category: "Frutas", kcal: 64, protein: 0.7, carbs: 16.5, fat: 0.3, fiber: 1.6 },
  { id: "fr-26", name: "Manga espada", category: "Frutas", kcal: 59, protein: 0.7, carbs: 15.5, fat: 0.3, fiber: 1.5 },
  { id: "fr-27", name: "Maracujá", category: "Frutas", kcal: 68, protein: 2.2, carbs: 13.7, fat: 0.7, fiber: 1.6 },
  { id: "fr-28", name: "Melancia", category: "Frutas", kcal: 33, protein: 0.7, carbs: 8.1, fat: 0.2, fiber: 0.4 },
  { id: "fr-29", name: "Melão", category: "Frutas", kcal: 29, protein: 0.8, carbs: 6.8, fat: 0.1, fiber: 0.3 },
  { id: "fr-30", name: "Mexerica", category: "Frutas", kcal: 37, protein: 0.8, carbs: 9.0, fat: 0.1, fiber: 0.7 },
  { id: "fr-31", name: "Morango", category: "Frutas", kcal: 30, protein: 0.8, carbs: 7.1, fat: 0.3, fiber: 1.7 },
  { id: "fr-32", name: "Pêra williams", category: "Frutas", kcal: 55, protein: 0.6, carbs: 14.7, fat: 0.1, fiber: 2.2 },
  { id: "fr-33", name: "Pêssego", category: "Frutas", kcal: 43, protein: 0.7, carbs: 11.0, fat: 0.1, fiber: 1.5 },
  { id: "fr-34", name: "Pitanga", category: "Frutas", kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.4, fiber: 2.5 },
  { id: "fr-35", name: "Uva itália", category: "Frutas", kcal: 63, protein: 0.7, carbs: 16.0, fat: 0.3, fiber: 0.9 },
  { id: "fr-36", name: "Uva red globe", category: "Frutas", kcal: 69, protein: 0.7, carbs: 17.4, fat: 0.3, fiber: 0.9 },

  // Cereais e derivados
  { id: "ce-01", name: "Arroz branco cozido", category: "Cereais e derivados", kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6 },
  { id: "ce-02", name: "Arroz integral cozido", category: "Cereais e derivados", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1.0, fiber: 2.7 },
  { id: "ce-03", name: "Aveia em flocos", category: "Cereais e derivados", kcal: 394, protein: 13.9, carbs: 66.6, fat: 8.5, fiber: 9.1 },
  { id: "ce-04", name: "Corn flakes", category: "Cereais e derivados", kcal: 381, protein: 7.7, carbs: 88.8, fat: 0.4, fiber: 0.5 },
  { id: "ce-05", name: "Cuscuz milho cozido", category: "Cereais e derivados", kcal: 131, protein: 3.3, carbs: 28.5, fat: 0.3, fiber: 1.2 },
  { id: "ce-06", name: "Fubá de milho", category: "Cereais e derivados", kcal: 361, protein: 7.5, carbs: 78.0, fat: 1.3, fiber: 6.8 },
  { id: "ce-07", name: "Granola", category: "Cereais e derivados", kcal: 461, protein: 8.5, carbs: 63.5, fat: 19.5, fiber: 5.2 },
  { id: "ce-08", name: "Macarrão cozido", category: "Cereais e derivados", kcal: 153, protein: 5.0, carbs: 31.0, fat: 1.0, fiber: 1.4 },
  { id: "ce-09", name: "Macarrão integral cozido", category: "Cereais e derivados", kcal: 144, protein: 5.5, carbs: 27.9, fat: 1.2, fiber: 3.7 },
  { id: "ce-10", name: "Milho cozido", category: "Cereais e derivados", kcal: 87, protein: 3.2, carbs: 18.6, fat: 1.0, fiber: 2.1 },
  { id: "ce-11", name: "Quinoa cozida", category: "Cereais e derivados", kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8 },
  { id: "ce-12", name: "Tapioca", category: "Cereais e derivados", kcal: 350, protein: 0.3, carbs: 86.4, fat: 0.2, fiber: 1.6 },
  { id: "ce-13", name: "Canjica branca cozida", category: "Cereais e derivados", kcal: 59, protein: 1.3, carbs: 13.3, fat: 0.3, fiber: 1.0 },

  // Pães, bolos e biscoitos
  { id: "pa-01", name: "Pão francês", category: "Pães, bolos e biscoitos", kcal: 300, protein: 9.4, carbs: 58.6, fat: 3.1, fiber: 2.3 },
  { id: "pa-02", name: "Pão de forma branco", category: "Pães, bolos e biscoitos", kcal: 264, protein: 8.0, carbs: 49.4, fat: 3.6, fiber: 2.1 },
  { id: "pa-03", name: "Pão de forma integral", category: "Pães, bolos e biscoitos", kcal: 253, protein: 9.1, carbs: 43.7, fat: 4.9, fiber: 7.9 },
  { id: "pa-04", name: "Pão de queijo", category: "Pães, bolos e biscoitos", kcal: 325, protein: 7.0, carbs: 55.0, fat: 8.5, fiber: 0.4 },
  { id: "pa-05", name: "Pão sírio", category: "Pães, bolos e biscoitos", kcal: 275, protein: 8.9, carbs: 55.7, fat: 1.5, fiber: 2.3 },
  { id: "pa-06", name: "Biscoito maizena", category: "Pães, bolos e biscoitos", kcal: 427, protein: 7.2, carbs: 73.5, fat: 12.2, fiber: 1.3 },
  { id: "pa-07", name: "Biscoito cream cracker", category: "Pães, bolos e biscoitos", kcal: 440, protein: 10.0, carbs: 66.3, fat: 13.9, fiber: 3.4 },
  { id: "pa-08", name: "Biscoito recheado", category: "Pães, bolos e biscoitos", kcal: 496, protein: 5.5, carbs: 70.5, fat: 22.2, fiber: 1.8 },
  { id: "pa-09", name: "Bolo simples", category: "Pães, bolos e biscoitos", kcal: 333, protein: 5.4, carbs: 56.6, fat: 9.8, fiber: 1.0 },
  { id: "pa-10", name: "Torrada integral", category: "Pães, bolos e biscoitos", kcal: 384, protein: 11.6, carbs: 75.3, fat: 4.7, fiber: 6.6 },

  // Carnes e aves
  { id: "ca-01", name: "Frango peito grelhado", category: "Carnes e aves", kcal: 159, protein: 32.8, carbs: 0.0, fat: 3.2 },
  { id: "ca-02", name: "Frango coxa assada", category: "Carnes e aves", kcal: 219, protein: 26.7, carbs: 0.0, fat: 12.1 },
  { id: "ca-03", name: "Frango sobrecoxa assada", category: "Carnes e aves", kcal: 237, protein: 24.4, carbs: 0.0, fat: 14.9 },
  { id: "ca-04", name: "Frango filé grelhado", category: "Carnes e aves", kcal: 163, protein: 31.5, carbs: 0.0, fat: 3.7 },
  { id: "ca-05", name: "Carne bovina patinho grelhado", category: "Carnes e aves", kcal: 219, protein: 32.5, carbs: 0.0, fat: 9.6 },
  { id: "ca-06", name: "Carne bovina acém cozido", category: "Carnes e aves", kcal: 225, protein: 29.6, carbs: 0.0, fat: 11.9 },
  { id: "ca-07", name: "Carne bovina alcatra grelhada", category: "Carnes e aves", kcal: 237, protein: 30.9, carbs: 0.0, fat: 12.4 },
  { id: "ca-08", name: "Carne bovina filé mignon", category: "Carnes e aves", kcal: 209, protein: 32.2, carbs: 0.0, fat: 8.4 },
  { id: "ca-09", name: "Carne bovina contrafilé", category: "Carnes e aves", kcal: 287, protein: 28.6, carbs: 0.0, fat: 18.7 },
  { id: "ca-10", name: "Carne bovina costela cozida", category: "Carnes e aves", kcal: 376, protein: 24.9, carbs: 0.0, fat: 30.1 },
  { id: "ca-11", name: "Carne bovina músculo cozido", category: "Carnes e aves", kcal: 183, protein: 28.1, carbs: 0.0, fat: 7.3 },
  { id: "ca-12", name: "Carne suína lombo grelhado", category: "Carnes e aves", kcal: 196, protein: 30.9, carbs: 0.0, fat: 7.8 },
  { id: "ca-13", name: "Carne suína pernil assado", category: "Carnes e aves", kcal: 281, protein: 27.1, carbs: 0.0, fat: 18.6 },
  { id: "ca-14", name: "Linguiça cozida", category: "Carnes e aves", kcal: 325, protein: 15.2, carbs: 0.0, fat: 29.0 },
  { id: "ca-15", name: "Presunto", category: "Carnes e aves", kcal: 107, protein: 16.6, carbs: 1.5, fat: 3.6 },
  { id: "ca-16", name: "Hambúrguer bovino grelhado", category: "Carnes e aves", kcal: 248, protein: 20.6, carbs: 5.0, fat: 16.5 },
  { id: "ca-17", name: "Bacon frito", category: "Carnes e aves", kcal: 541, protein: 14.2, carbs: 0.7, fat: 54.5 },
  { id: "ca-18", name: "Peito de peru", category: "Carnes e aves", kcal: 109, protein: 21.5, carbs: 1.2, fat: 2.1 },

  // Peixes e frutos do mar
  { id: "pe-01", name: "Atum em lata ao natural", category: "Peixes e frutos do mar", kcal: 132, protein: 27.5, carbs: 0.0, fat: 2.5 },
  { id: "pe-02", name: "Atum em lata óleo", category: "Peixes e frutos do mar", kcal: 194, protein: 26.6, carbs: 0.0, fat: 9.5 },
  { id: "pe-03", name: "Bacalhau cozido", category: "Peixes e frutos do mar", kcal: 147, protein: 31.5, carbs: 0.0, fat: 2.0 },
  { id: "pe-04", name: "Salmão grelhado", category: "Peixes e frutos do mar", kcal: 179, protein: 24.9, carbs: 0.0, fat: 8.3 },
  { id: "pe-05", name: "Sardinha em lata", category: "Peixes e frutos do mar", kcal: 208, protein: 23.5, carbs: 0.0, fat: 12.2 },
  { id: "pe-06", name: "Tilápia grelhada", category: "Peixes e frutos do mar", kcal: 129, protein: 26.1, carbs: 0.0, fat: 2.7 },
  { id: "pe-07", name: "Camarão cozido", category: "Peixes e frutos do mar", kcal: 90, protein: 18.7, carbs: 0.9, fat: 1.2 },
  { id: "pe-08", name: "Filé de merluza cozido", category: "Peixes e frutos do mar", kcal: 87, protein: 18.3, carbs: 0.0, fat: 1.3 },

  // Ovos e laticínios
  { id: "ov-01", name: "Ovo inteiro cozido", category: "Ovos e laticínios", kcal: 146, protein: 13.3, carbs: 0.6, fat: 9.5 },
  { id: "ov-02", name: "Ovo inteiro mexido", category: "Ovos e laticínios", kcal: 178, protein: 12.0, carbs: 1.2, fat: 13.8 },
  { id: "ov-03", name: "Clara de ovo cozida", category: "Ovos e laticínios", kcal: 52, protein: 11.0, carbs: 0.8, fat: 0.2 },
  { id: "ov-04", name: "Gema de ovo cozida", category: "Ovos e laticínios", kcal: 322, protein: 16.1, carbs: 0.6, fat: 27.7 },
  { id: "ov-05", name: "Leite integral", category: "Ovos e laticínios", kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 },
  { id: "ov-06", name: "Leite desnatado", category: "Ovos e laticínios", kcal: 35, protein: 3.5, carbs: 5.1, fat: 0.2 },
  { id: "ov-07", name: "Leite semidesnatado", category: "Ovos e laticínios", kcal: 47, protein: 3.3, carbs: 4.8, fat: 1.6 },
  { id: "ov-08", name: "Iogurte natural integral", category: "Ovos e laticínios", kcal: 71, protein: 4.3, carbs: 5.0, fat: 3.7 },
  { id: "ov-09", name: "Iogurte natural desnatado", category: "Ovos e laticínios", kcal: 43, protein: 4.5, carbs: 5.6, fat: 0.3 },
  { id: "ov-10", name: "Queijo minas frescal", category: "Ovos e laticínios", kcal: 264, protein: 17.4, carbs: 2.8, fat: 20.2 },
  { id: "ov-11", name: "Queijo mussarela", category: "Ovos e laticínios", kcal: 330, protein: 24.0, carbs: 2.2, fat: 25.1 },
  { id: "ov-12", name: "Queijo cheddar", category: "Ovos e laticínios", kcal: 370, protein: 22.9, carbs: 4.1, fat: 29.1 },
  { id: "ov-13", name: "Queijo parmesão", category: "Ovos e laticínios", kcal: 393, protein: 35.6, carbs: 3.2, fat: 26.0 },
  { id: "ov-14", name: "Queijo ricota", category: "Ovos e laticínios", kcal: 174, protein: 12.6, carbs: 2.3, fat: 13.0 },
  { id: "ov-15", name: "Requeijão cremoso", category: "Ovos e laticínios", kcal: 239, protein: 10.5, carbs: 1.8, fat: 21.1 },
  { id: "ov-16", name: "Manteiga", category: "Ovos e laticínios", kcal: 741, protein: 0.5, carbs: 0.1, fat: 83.2 },
  { id: "ov-17", name: "Margarina", category: "Ovos e laticínios", kcal: 563, protein: 0.5, carbs: 0.7, fat: 62.3 },
  { id: "ov-18", name: "Creme de leite", category: "Ovos e laticínios", kcal: 218, protein: 2.9, carbs: 3.0, fat: 22.5 },
  { id: "ov-19", name: "Cream cheese", category: "Ovos e laticínios", kcal: 349, protein: 6.2, carbs: 4.1, fat: 34.5 },
  { id: "ov-20", name: "Leite condensado", category: "Ovos e laticínios", kcal: 322, protein: 7.5, carbs: 55.3, fat: 8.3 },

  // Leguminosas
  { id: "le-01", name: "Feijão preto cozido", category: "Leguminosas", kcal: 77, protein: 4.5, carbs: 14.0, fat: 0.5, fiber: 8.4 },
  { id: "le-02", name: "Feijão carioca cozido", category: "Leguminosas", kcal: 77, protein: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5 },
  { id: "le-03", name: "Feijão branco cozido", category: "Leguminosas", kcal: 96, protein: 6.4, carbs: 18.5, fat: 0.3, fiber: 7.5 },
  { id: "le-04", name: "Lentilha cozida", category: "Leguminosas", kcal: 93, protein: 6.3, carbs: 16.7, fat: 0.5, fiber: 7.9 },
  { id: "le-05", name: "Grão de bico cozido", category: "Leguminosas", kcal: 180, protein: 9.3, carbs: 28.4, fat: 3.0, fiber: 7.6 },
  { id: "le-06", name: "Ervilha cozida", category: "Leguminosas", kcal: 78, protein: 5.5, carbs: 13.7, fat: 0.2, fiber: 5.8 },
  { id: "le-07", name: "Soja cozida", category: "Leguminosas", kcal: 195, protein: 16.6, carbs: 12.8, fat: 9.0, fiber: 9.9 },

  // Verduras e legumes
  { id: "vl-01", name: "Abóbora cozida", category: "Verduras e legumes", kcal: 17, protein: 0.8, carbs: 3.8, fat: 0.1, fiber: 1.3 },
  { id: "vl-02", name: "Abobrinha cozida", category: "Verduras e legumes", kcal: 16, protein: 1.2, carbs: 2.7, fat: 0.2, fiber: 1.3 },
  { id: "vl-03", name: "Alface crespa", category: "Verduras e legumes", kcal: 11, protein: 1.3, carbs: 1.5, fat: 0.2, fiber: 1.8 },
  { id: "vl-04", name: "Batata inglesa cozida", category: "Verduras e legumes", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0.1, fiber: 1.3 },
  { id: "vl-05", name: "Batata doce cozida", category: "Verduras e legumes", kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1, fiber: 2.2 },
  { id: "vl-06", name: "Batata frita", category: "Verduras e legumes", kcal: 291, protein: 3.4, carbs: 37.9, fat: 14.8, fiber: 3.1 },
  { id: "vl-07", name: "Beterraba cozida", category: "Verduras e legumes", kcal: 39, protein: 1.8, carbs: 8.8, fat: 0.1, fiber: 3.0 },
  { id: "vl-08", name: "Brócolis cozido", category: "Verduras e legumes", kcal: 25, protein: 3.0, carbs: 3.1, fat: 0.4, fiber: 2.9 },
  { id: "vl-09", name: "Cenoura crua", category: "Verduras e legumes", kcal: 34, protein: 1.3, carbs: 7.7, fat: 0.3, fiber: 3.2 },
  { id: "vl-10", name: "Chuchu cozido", category: "Verduras e legumes", kcal: 16, protein: 0.6, carbs: 3.5, fat: 0.1, fiber: 1.5 },
  { id: "vl-11", name: "Couve refogada", category: "Verduras e legumes", kcal: 26, protein: 2.4, carbs: 2.8, fat: 0.6, fiber: 2.9 },
  { id: "vl-12", name: "Espinafre cozido", category: "Verduras e legumes", kcal: 17, protein: 2.1, carbs: 2.4, fat: 0.3, fiber: 2.2 },
  { id: "vl-13", name: "Inhame cozido", category: "Verduras e legumes", kcal: 88, protein: 2.3, carbs: 20.4, fat: 0.2, fiber: 2.0 },
  { id: "vl-14", name: "Mandioca cozida", category: "Verduras e legumes", kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3, fiber: 1.9 },
  { id: "vl-15", name: "Mandioquinha cozida", category: "Verduras e legumes", kcal: 81, protein: 1.8, carbs: 18.2, fat: 0.2, fiber: 2.5 },
  { id: "vl-16", name: "Pepino", category: "Verduras e legumes", kcal: 10, protein: 0.6, carbs: 1.8, fat: 0.1, fiber: 0.7 },
  { id: "vl-17", name: "Pimentão verde", category: "Verduras e legumes", kcal: 20, protein: 0.9, carbs: 4.2, fat: 0.3, fiber: 1.3 },
  { id: "vl-18", name: "Quiabo cozido", category: "Verduras e legumes", kcal: 27, protein: 1.9, carbs: 5.8, fat: 0.1, fiber: 3.0 },
  { id: "vl-19", name: "Repolho cru", category: "Verduras e legumes", kcal: 22, protein: 1.3, carbs: 4.9, fat: 0.1, fiber: 2.1 },
  { id: "vl-20", name: "Tomate", category: "Verduras e legumes", kcal: 15, protein: 1.0, carbs: 3.1, fat: 0.3, fiber: 1.2 },
  { id: "vl-21", name: "Vagem cozida", category: "Verduras e legumes", kcal: 24, protein: 1.9, carbs: 4.2, fat: 0.2, fiber: 2.5 },
  { id: "vl-22", name: "Berinjela cozida", category: "Verduras e legumes", kcal: 21, protein: 1.1, carbs: 4.4, fat: 0.2, fiber: 2.3 },

  // Oleaginosas e sementes
  { id: "ol-01", name: "Amendoim torrado", category: "Oleaginosas e sementes", kcal: 567, protein: 26.2, carbs: 20.3, fat: 43.9, fiber: 8.5 },
  { id: "ol-02", name: "Castanha do Pará", category: "Oleaginosas e sementes", kcal: 656, protein: 14.3, carbs: 12.3, fat: 63.5, fiber: 7.9 },
  { id: "ol-03", name: "Castanha de caju torrada", category: "Oleaginosas e sementes", kcal: 570, protein: 15.3, carbs: 29.0, fat: 45.8, fiber: 3.7 },
  { id: "ol-04", name: "Nozes", category: "Oleaginosas e sementes", kcal: 620, protein: 15.2, carbs: 9.0, fat: 58.4, fiber: 4.8 },
  { id: "ol-05", name: "Pasta de amendoim", category: "Oleaginosas e sementes", kcal: 598, protein: 22.0, carbs: 22.3, fat: 46.8, fiber: 5.9 },
  { id: "ol-06", name: "Amêndoas", category: "Oleaginosas e sementes", kcal: 579, protein: 21.2, carbs: 19.5, fat: 49.9, fiber: 12.5 },
  { id: "ol-07", name: "Sementes de chia", category: "Oleaginosas e sementes", kcal: 490, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 },
  { id: "ol-08", name: "Sementes de linhaça", category: "Oleaginosas e sementes", kcal: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 },
  { id: "ol-09", name: "Sementes de abóbora", category: "Oleaginosas e sementes", kcal: 559, protein: 30.2, carbs: 10.7, fat: 45.9, fiber: 6.0 },
  { id: "ol-10", name: "Coco ralado seco", category: "Oleaginosas e sementes", kcal: 614, protein: 5.7, carbs: 23.6, fat: 58.9, fiber: 16.3 },

  // Óleos e gorduras
  { id: "og-01", name: "Azeite de oliva", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: "og-02", name: "Óleo de soja", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: "og-03", name: "Óleo de coco", category: "Óleos e gorduras", kcal: 892, protein: 0.0, carbs: 0.0, fat: 99.1 },
  { id: "og-04", name: "Óleo de canola", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: "og-05", name: "Óleo de girassol", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },

  // Doces e sobremesas
  { id: "do-01", name: "Chocolate ao leite", category: "Doces e sobremesas", kcal: 533, protein: 7.0, carbs: 59.0, fat: 31.0 },
  { id: "do-02", name: "Chocolate amargo 70%", category: "Doces e sobremesas", kcal: 567, protein: 8.0, carbs: 42.0, fat: 41.0 },
  { id: "do-03", name: "Chocolate amargo 85%", category: "Doces e sobremesas", kcal: 600, protein: 9.0, carbs: 34.0, fat: 46.0 },
  { id: "do-04", name: "Chocolate branco", category: "Doces e sobremesas", kcal: 539, protein: 5.9, carbs: 59.3, fat: 31.3 },
  { id: "do-05", name: "Sorvete de creme", category: "Doces e sobremesas", kcal: 201, protein: 3.7, carbs: 24.5, fat: 10.0 },
  { id: "do-06", name: "Mel", category: "Doces e sobremesas", kcal: 309, protein: 0.4, carbs: 84.4, fat: 0.0 },
  { id: "do-07", name: "Açúcar branco", category: "Doces e sobremesas", kcal: 387, protein: 0.0, carbs: 100.0, fat: 0.0 },
  { id: "do-08", name: "Açúcar mascavo", category: "Doces e sobremesas", kcal: 365, protein: 0.0, carbs: 95.0, fat: 0.0 },
  { id: "do-09", name: "Geleia de frutas", category: "Doces e sobremesas", kcal: 243, protein: 0.4, carbs: 62.6, fat: 0.1 },
  { id: "do-10", name: "Pudim de leite", category: "Doces e sobremesas", kcal: 150, protein: 4.5, carbs: 23.5, fat: 4.2 },

  // Bebidas e sucos
  { id: "be-01", name: "Suco de laranja natural", category: "Bebidas e sucos", kcal: 46, protein: 0.7, carbs: 11.4, fat: 0.1 },
  { id: "be-02", name: "Suco de maracujá natural", category: "Bebidas e sucos", kcal: 49, protein: 1.6, carbs: 10.0, fat: 0.5 },
  { id: "be-03", name: "Suco de uva integral", category: "Bebidas e sucos", kcal: 61, protein: 0.2, carbs: 15.8, fat: 0.1 },
  { id: "be-04", name: "Leite de coco", category: "Bebidas e sucos", kcal: 196, protein: 1.7, carbs: 4.2, fat: 20.4 },
  { id: "be-05", name: "Café preto sem açúcar", category: "Bebidas e sucos", kcal: 2, protein: 0.3, carbs: 0.3, fat: 0.1 },
  { id: "be-06", name: "Refrigerante cola", category: "Bebidas e sucos", kcal: 37, protein: 0.0, carbs: 9.3, fat: 0.0 },
  { id: "be-07", name: "Água de coco", category: "Bebidas e sucos", kcal: 19, protein: 0.2, carbs: 4.6, fat: 0.1 },
  { id: "be-08", name: "Bebida vegetal de aveia", category: "Bebidas e sucos", kcal: 46, protein: 1.2, carbs: 8.0, fat: 1.0 },
  { id: "be-09", name: "Bebida vegetal de amêndoa", category: "Bebidas e sucos", kcal: 24, protein: 0.7, carbs: 3.0, fat: 1.1 },
  { id: "be-10", name: "Suco de tomate", category: "Bebidas e sucos", kcal: 15, protein: 0.8, carbs: 3.3, fat: 0.1 },

  // Suplementos
  { id: "su-01", name: "Whey protein concentrado", category: "Suplementos", kcal: 370, protein: 80.0, carbs: 7.0, fat: 3.0 },
  { id: "su-02", name: "Whey protein isolado", category: "Suplementos", kcal: 373, protein: 90.0, carbs: 3.0, fat: 1.0 },
  { id: "su-03", name: "Caseína", category: "Suplementos", kcal: 373, protein: 80.0, carbs: 7.0, fat: 2.0 },
  { id: "su-04", name: "Albumina em pó", category: "Suplementos", kcal: 363, protein: 83.0, carbs: 5.0, fat: 1.0 },
  { id: "su-05", name: "Dextrose", category: "Suplementos", kcal: 376, protein: 0.0, carbs: 94.0, fat: 0.0 },
  { id: "su-06", name: "Maltodextrina", category: "Suplementos", kcal: 378, protein: 0.0, carbs: 96.0, fat: 0.0 },
  { id: "su-07", name: "Proteína vegana (ervilha)", category: "Suplementos", kcal: 360, protein: 75.0, carbs: 8.0, fat: 5.0 },
  { id: "su-08", name: "Creatina", category: "Suplementos", kcal: 0, protein: 0.0, carbs: 0.0, fat: 0.0 },
  { id: "su-09", name: "BCAA em pó", category: "Suplementos", kcal: 240, protein: 50.0, carbs: 7.0, fat: 1.5 },
  { id: "su-10", name: "Colágeno hidrolisado", category: "Suplementos", kcal: 363, protein: 90.0, carbs: 0.0, fat: 0.0 },
  { id: "su-11", name: "Ômega 3 (óleo de peixe)", category: "Suplementos", kcal: 900, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: "su-12", name: "Spirulina em pó", category: "Suplementos", kcal: 290, protein: 57.0, carbs: 24.0, fat: 8.0 },

  // ── Frutas — adicionados via FatSecret ─────────────────────────────────────
  { id: "fr-37", name: "Pitaia vermelha", category: "Frutas", kcal: 51, protein: 0.8, carbs: 12.4, fat: 0.4 },
  { id: "fr-38", name: "Framboesa", category: "Frutas", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0.7, fiber: 6.5 },
  { id: "fr-39", name: "Romã", category: "Frutas", kcal: 68, protein: 1.0, carbs: 17.2, fat: 0.3, fiber: 0.6 },
  { id: "fr-40", name: "Mirtilo (blueberry)", category: "Frutas", kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4 },
  { id: "fr-41", name: "Amora preta", category: "Frutas", kcal: 43, protein: 1.4, carbs: 9.6, fat: 0.5, fiber: 5.3 },
  { id: "fr-42", name: "Nectarina", category: "Frutas", kcal: 44, protein: 1.1, carbs: 10.6, fat: 0.3, fiber: 1.7 },
  { id: "fr-43", name: "Carambola", category: "Frutas", kcal: 31, protein: 1.0, carbs: 6.7, fat: 0.3, fiber: 2.8 },
  { id: "fr-44", name: "Lichia", category: "Frutas", kcal: 66, protein: 0.8, carbs: 17.0, fat: 0.4, fiber: 1.3 },
  { id: "fr-45", name: "Manga palmer", category: "Frutas", kcal: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6 },
  { id: "fr-46", name: "Banana verde cozida", category: "Frutas", kcal: 98, protein: 1.4, carbs: 25.8, fat: 0.1, fiber: 4.9 },

  // ── Cereais e derivados — adicionados via FatSecret ────────────────────────
  { id: "ce-14", name: "Arroz parboilizado cozido", category: "Cereais e derivados", kcal: 123, protein: 2.9, carbs: 26.1, fat: 0.4 },
  { id: "ce-15", name: "Farinha de mandioca torrada", category: "Cereais e derivados", kcal: 357, protein: 1.3, carbs: 87.4, fat: 0.2, fiber: 6.5 },
  { id: "ce-16", name: "Polenta cozida", category: "Cereais e derivados", kcal: 70, protein: 1.7, carbs: 14.9, fat: 0.4, fiber: 0.7 },
  { id: "ce-17", name: "Farinha de trigo integral", category: "Cereais e derivados", kcal: 340, protein: 13.2, carbs: 72.0, fat: 2.5, fiber: 11.6 },
  { id: "ce-18", name: "Farinha de trigo branca", category: "Cereais e derivados", kcal: 361, protein: 9.8, carbs: 76.2, fat: 1.4, fiber: 2.3 },
  { id: "ce-19", name: "Arroz 7 grãos cozido", category: "Cereais e derivados", kcal: 130, protein: 3.2, carbs: 27.0, fat: 0.8, fiber: 2.4 },
  { id: "ce-20", name: "Granola sem açúcar", category: "Cereais e derivados", kcal: 350, protein: 16.0, carbs: 67.5, fat: 7.0, fiber: 8.0 },
  { id: "ce-21", name: "Farinha de aveia", category: "Cereais e derivados", kcal: 382, protein: 15.0, carbs: 60.0, fat: 7.2, fiber: 7.0 },
  { id: "ce-22", name: "Trigo para quibe (cru)", category: "Cereais e derivados", kcal: 340, protein: 10.7, carbs: 75.9, fat: 1.5, fiber: 15.0 },

  // ── Pães, bolos e biscoitos — adicionados via FatSecret ────────────────────
  { id: "pa-11", name: "Tortilha wrap", category: "Pães, bolos e biscoitos", kcal: 296, protein: 7.9, carbs: 49.4, fat: 7.0 },
  { id: "pa-12", name: "Pão de hambúrguer", category: "Pães, bolos e biscoitos", kcal: 265, protein: 8.5, carbs: 48.0, fat: 4.5 },
  { id: "pa-13", name: "Pão de hot dog", category: "Pães, bolos e biscoitos", kcal: 266, protein: 8.0, carbs: 49.0, fat: 3.8 },
  { id: "pa-14", name: "Pão de centeio", category: "Pães, bolos e biscoitos", kcal: 259, protein: 8.5, carbs: 48.3, fat: 3.3, fiber: 5.8 },
  { id: "pa-15", name: "Pão de batata", category: "Pães, bolos e biscoitos", kcal: 258, protein: 7.8, carbs: 49.0, fat: 3.2 },
  { id: "pa-16", name: "Bolo de cenoura com cobertura", category: "Pães, bolos e biscoitos", kcal: 343, protein: 4.2, carbs: 56.0, fat: 12.0 },
  { id: "pa-17", name: "Biscoito de arroz", category: "Pães, bolos e biscoitos", kcal: 387, protein: 7.8, carbs: 81.6, fat: 3.8 },
  { id: "pa-18", name: "Waffle", category: "Pães, bolos e biscoitos", kcal: 291, protein: 7.9, carbs: 42.0, fat: 10.0 },

  // ── Carnes e aves — adicionados via FatSecret ──────────────────────────────
  { id: "ca-19", name: "Carne bovina coxão mole", category: "Carnes e aves", kcal: 130, protein: 23.0, carbs: 2.0, fat: 4.5 },
  { id: "ca-20", name: "Carne bovina coxão duro", category: "Carnes e aves", kcal: 142, protein: 21.6, carbs: 0.0, fat: 5.5 },
  { id: "ca-21", name: "Carne bovina picanha grelhada", category: "Carnes e aves", kcal: 271, protein: 27.0, carbs: 0.0, fat: 17.5 },
  { id: "ca-22", name: "Frango coração cozido", category: "Carnes e aves", kcal: 185, protein: 26.4, carbs: 0.1, fat: 7.9 },
  { id: "ca-23", name: "Linguiça de frango grelhada", category: "Carnes e aves", kcal: 237, protein: 14.1, carbs: 5.5, fat: 17.2 },
  { id: "ca-24", name: "Carne bovina moída grelhada", category: "Carnes e aves", kcal: 217, protein: 26.1, carbs: 0.0, fat: 11.7 },
  { id: "ca-25", name: "Pato assado (sem pele)", category: "Carnes e aves", kcal: 201, protein: 23.5, carbs: 0.0, fat: 11.2 },
  { id: "ca-26", name: "Frango asa assada", category: "Carnes e aves", kcal: 290, protein: 26.9, carbs: 0.0, fat: 19.5 },
  { id: "ca-27", name: "Carne suína bisteca grelhada", category: "Carnes e aves", kcal: 231, protein: 24.6, carbs: 0.0, fat: 14.0 },
  { id: "ca-28", name: "Salsicha cozida", category: "Carnes e aves", kcal: 241, protein: 10.3, carbs: 4.6, fat: 20.0 },

  // ── Peixes e frutos do mar — adicionados via FatSecret ─────────────────────
  { id: "pe-09", name: "Salmão cru", category: "Peixes e frutos do mar", kcal: 146, protein: 21.6, carbs: 0.0, fat: 5.9 },
  { id: "pe-10", name: "Atum fresco grelhado", category: "Peixes e frutos do mar", kcal: 184, protein: 29.9, carbs: 0.0, fat: 6.3 },
  { id: "pe-11", name: "Cação cozido", category: "Peixes e frutos do mar", kcal: 120, protein: 22.7, carbs: 0.0, fat: 2.5 },
  { id: "pe-12", name: "Dourado grelhado", category: "Peixes e frutos do mar", kcal: 118, protein: 24.8, carbs: 0.0, fat: 1.6 },
  { id: "pe-13", name: "Truta grelhada", category: "Peixes e frutos do mar", kcal: 190, protein: 26.6, carbs: 0.0, fat: 8.9 },
  { id: "pe-14", name: "Polvo cozido", category: "Peixes e frutos do mar", kcal: 164, protein: 29.8, carbs: 4.4, fat: 2.1 },
  { id: "pe-15", name: "Lula grelhada", category: "Peixes e frutos do mar", kcal: 175, protein: 17.9, carbs: 7.8, fat: 7.5 },
  { id: "pe-16", name: "Ostra crua", category: "Peixes e frutos do mar", kcal: 68, protein: 7.1, carbs: 3.9, fat: 2.5 },

  // ── Verduras e legumes — adicionados via FatSecret ─────────────────────────
  { id: "vl-23", name: "Palmito cozido", category: "Verduras e legumes", kcal: 28, protein: 2.5, carbs: 4.6, fat: 0.6 },
  { id: "vl-24", name: "Couve-flor cozida", category: "Verduras e legumes", kcal: 25, protein: 1.9, carbs: 4.1, fat: 0.3, fiber: 2.0 },
  { id: "vl-25", name: "Cebola crua", category: "Verduras e legumes", kcal: 39, protein: 1.7, carbs: 8.9, fat: 0.1, fiber: 1.7 },
  { id: "vl-26", name: "Aspargo cozido", category: "Verduras e legumes", kcal: 22, protein: 2.4, carbs: 4.1, fat: 0.2, fiber: 2.1 },
  { id: "vl-27", name: "Batata doce roxa cozida", category: "Verduras e legumes", kcal: 82, protein: 2.4, carbs: 18.3, fat: 0.1, fiber: 3.3 },
  { id: "vl-28", name: "Aipim/mandioca frita", category: "Verduras e legumes", kcal: 197, protein: 0.9, carbs: 30.5, fat: 7.9 },
  { id: "vl-29", name: "Milho verde enlatado", category: "Verduras e legumes", kcal: 86, protein: 3.2, carbs: 19.7, fat: 0.9, fiber: 1.8 },
  { id: "vl-30", name: "Alho cru", category: "Verduras e legumes", kcal: 149, protein: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1 },
  { id: "vl-31", name: "Ervilha torta cozida", category: "Verduras e legumes", kcal: 42, protein: 2.8, carbs: 7.6, fat: 0.2, fiber: 2.6 },
  { id: "vl-32", name: "Acelga cozida", category: "Verduras e legumes", kcal: 19, protein: 1.8, carbs: 3.6, fat: 0.1, fiber: 1.6 },
  { id: "vl-33", name: "Pimentão vermelho cru", category: "Verduras e legumes", kcal: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1 },
  { id: "vl-34", name: "Pimentão amarelo cru", category: "Verduras e legumes", kcal: 27, protein: 1.0, carbs: 6.3, fat: 0.2, fiber: 0.9 },
  { id: "vl-35", name: "Agrião cru", category: "Verduras e legumes", kcal: 22, protein: 2.3, carbs: 1.3, fat: 0.1, fiber: 0.5 },

  // ── Leguminosas — adicionadas via FatSecret ────────────────────────────────
  { id: "le-08", name: "Feijão vermelho cozido", category: "Leguminosas", kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4 },
  { id: "le-09", name: "Feijão de corda cozido", category: "Leguminosas", kcal: 65, protein: 5.1, carbs: 14.0, fat: 0.6, fiber: 4.2 },
  { id: "le-10", name: "Feijão fradinho cozido", category: "Leguminosas", kcal: 116, protein: 7.6, carbs: 20.7, fat: 0.7, fiber: 4.3 },
  { id: "le-11", name: "Amendoim cozido", category: "Leguminosas", kcal: 318, protein: 13.5, carbs: 21.3, fat: 22.0, fiber: 6.7 },
  { id: "le-12", name: "Ervilha partida cozida", category: "Leguminosas", kcal: 118, protein: 8.3, carbs: 21.1, fat: 0.4, fiber: 8.3 },

  // ── Oleaginosas e sementes — adicionadas via FatSecret ─────────────────────
  { id: "og-06", name: "Pistache torrado", category: "Oleaginosas e sementes", kcal: 562, protein: 20.2, carbs: 27.7, fat: 45.4, fiber: 10.3 },
  { id: "og-07", name: "Macadâmia torrada", category: "Oleaginosas e sementes", kcal: 718, protein: 7.9, carbs: 13.7, fat: 76.1, fiber: 8.6 },
  { id: "og-08", name: "Sementes de girassol", category: "Oleaginosas e sementes", kcal: 584, protein: 20.8, carbs: 20.0, fat: 51.5, fiber: 8.6 },
  { id: "og-09", name: "Sementes de gergelim", category: "Oleaginosas e sementes", kcal: 573, protein: 17.7, carbs: 23.5, fat: 49.7, fiber: 11.8 },
  { id: "og-10", name: "Castanha de baru", category: "Oleaginosas e sementes", kcal: 559, protein: 23.9, carbs: 23.9, fat: 40.0, fiber: 13.4 },
  { id: "og-11", name: "Hemp seeds (sementes de cânhamo)", category: "Oleaginosas e sementes", kcal: 553, protein: 31.6, carbs: 8.7, fat: 48.7, fiber: 4.0 },

  // ── Óleos e gorduras — adicionados via FatSecret ───────────────────────────
  { id: "ol-11", name: "Manteiga ghee", category: "Óleos e gorduras", kcal: 876, protein: 0.3, carbs: 0.0, fat: 99.5 },
  { id: "ol-12", name: "Óleo de abacate", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: "ol-13", name: "Azeite de dendê", category: "Óleos e gorduras", kcal: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },

  // ── Doces e sobremesas — adicionados via FatSecret ────────────────────────
  { id: "do-11", name: "Brigadeiro", category: "Doces e sobremesas", kcal: 400, protein: 5.5, carbs: 60.0, fat: 14.0 },
  { id: "do-12", name: "Paçoca", category: "Doces e sobremesas", kcal: 470, protein: 14.5, carbs: 55.5, fat: 21.0, fiber: 3.5 },
  { id: "do-13", name: "Pé de moleque", category: "Doces e sobremesas", kcal: 464, protein: 11.0, carbs: 55.0, fat: 22.0, fiber: 2.5 },
  { id: "do-14", name: "Mousse de maracujá", category: "Doces e sobremesas", kcal: 160, protein: 3.5, carbs: 22.0, fat: 6.5 },
  { id: "do-15", name: "Torta de limão", category: "Doces e sobremesas", kcal: 253, protein: 3.2, carbs: 36.0, fat: 10.8 },
  { id: "do-16", name: "Açaí com guaraná (tigela)", category: "Doces e sobremesas", kcal: 170, protein: 2.1, carbs: 28.0, fat: 6.5 },
  { id: "do-17", name: "Canjica com leite condensado", category: "Doces e sobremesas", kcal: 180, protein: 4.5, carbs: 34.0, fat: 3.0 },

  // ── Bebidas e sucos — adicionados via FatSecret ────────────────────────────
  { id: "be-11", name: "Chá verde (infusão)", category: "Bebidas e sucos", kcal: 1, protein: 0.0, carbs: 0.5, fat: 0.0 },
  { id: "be-12", name: "Chá mate gelado", category: "Bebidas e sucos", kcal: 4, protein: 0.0, carbs: 1.0, fat: 0.0 },
  { id: "be-13", name: "Vitamina de banana com leite", category: "Bebidas e sucos", kcal: 90, protein: 3.5, carbs: 16.5, fat: 1.8 },
  { id: "be-14", name: "Suco de acerola natural", category: "Bebidas e sucos", kcal: 23, protein: 0.4, carbs: 5.5, fat: 0.1 },
  { id: "be-15", name: "Suco verde (couve + limão)", category: "Bebidas e sucos", kcal: 18, protein: 0.9, carbs: 3.5, fat: 0.1 },
  { id: "be-16", name: "Isofénico (isotônico)", category: "Bebidas e sucos", kcal: 28, protein: 0.0, carbs: 7.0, fat: 0.0 },
  { id: "be-17", name: "Leite de amendoim", category: "Bebidas e sucos", kcal: 33, protein: 1.5, carbs: 2.0, fat: 2.5 },
];

export function searchFoods(query: string, limit = 20): FoodItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return BUILT_IN_FOODS.filter(f => {
    const name = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return name.includes(q);
  }).slice(0, limit);
}
