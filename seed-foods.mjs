// Script para importar alimentos do arquivo alimentos.csv para o Supabase
// Execute com: node seed-foods.mjs

import fs from 'fs';

const SUPABASE_URL = "https://qwwltjaoftnsuvpgrsmm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1vEN1lReoOiYFoZP7mq4QA_j6ldSbTR";

async function seedFoods() {
  console.log("🌱 Lendo arquivo alimentos.csv...");
  
  const rawData = fs.readFileSync('alimentos.csv', 'utf8');
  const lines = rawData.split('\n').slice(1); // Pular cabeçalho
  
  const foods = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // O CSV usa ponto-e-vírgula como separador
    const parts = line.split(';');
    
    // Formatação: Colunas 1=Categoria, 2=Nome, 4=kcal, 6=prot, 7=fat, 9=carb
    // Precisamos substituir vírgula decimal por ponto e converter para float
    const parseNumber = (val) => parseFloat(val.replace(',', '.')) || 0;

    const food = {
      category: parts[1],
      name: parts[2],
      kcal: parseNumber(parts[4]),
      protein: parseNumber(parts[6]),
      fat: parseNumber(parts[7]),
      carbs: parseNumber(parts[9]),
      household_measures: [] // Inicializa vazio
    };

    if (food.name) {
      foods.push(food);
    }
  }

  console.log(`🚀 Preparando para inserir ${foods.length} alimentos no Supabase...`);

  // Supabase bulk insert
  const res = await fetch(`${SUPABASE_URL}/rest/v1/foods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(foods),
  });

  if (res.ok || res.status === 201) {
    console.log("✅ Alimentos inseridos com sucesso!");
  } else {
    const err = await res.text();
    console.error("❌ Erro na inserção:", err);
  }
}

seedFoods();
