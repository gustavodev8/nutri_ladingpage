-- Template: Dieta Esportiva — 6 Refeições com Pré-treino
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES (
  'Dieta Esportiva — 6 Refeições com Pré-treino',
  'Plano com 6 refeições incluindo pré-treino. Whey na colação, proteína distribuída e opções de substituição para cada refeição. PTN 37% · CHO 33% · LIP 30%.',
  'emagrecimento', 1416.0, 130.2, 117.3, 49.7, TRUE
)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM diet_templates WHERE name = 'Dieta Esportiva — 6 Refeições com Pré-treino' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.n, m.t, m.o FROM tmpl, (VALUES
  ('Café da Manhã',             '08:00',  0),
  ('Café da Manhã — Sub. 1',    '08:00',  1),
  ('Colação',                   '10:00',  2),
  ('Colação — Sub. 1',          '10:00',  3),
  ('Almoço',                    '12:30',  4),
  ('Almoço — Sub. 1',           '12:30',  5),
  ('Lanche da tarde',           '15:00',  6),
  ('Lanche da tarde — Sub. 1',  '15:00',  7),
  ('Pré-treino',                '17:00',  8),
  ('Pré-treino — Sub. 1',       '17:00',  9),
  ('Jantar',                    '19:30', 10),
  ('Jantar — Sub. 1',           '19:30', 11)
) AS m(n,t,o) ON CONFLICT DO NOTHING;

-- 08:00 Café da Manhã
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Café da Manhã' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Ovo de galinha cozido',100.0,'g','unidade',2.0::numeric,146.0,12.9,0.5,9.8,'Proteína',0),
  ((SELECT id FROM meal),'Banana cozida',100.0,'g','unidade',1.0::numeric,98.0,1.3,25.8,0.1,'Fruta',1),
  ((SELECT id FROM meal),'Café coado (sem açúcar)',200.0,'ml','xícara',1.0::numeric,2.0,0.3,0.0,0.0,'Bebida',2)
ON CONFLICT DO NOTHING;

-- 08:00 Café da Manhã — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Café da Manhã — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Pão integral',50.0,'g','fatia',2.0::numeric,240.0,9.0,43.0,4.0,'Carboidrato',0),
  ((SELECT id FROM meal),'Peito de frango grelhado',50.0,'g',NULL,NULL::numeric,159.0,32.0,0.0,3.0,'Proteína',1),
  ((SELECT id FROM meal),'Café coado (sem açúcar)',200.0,'ml','xícara',1.0::numeric,2.0,0.3,0.0,0.0,'Bebida',2)
ON CONFLICT DO NOTHING;

-- 10:00 Colação
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Colação' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Whey Protein (Zero Lactose)',30.0,'g','scoop',1.0::numeric,400.0,80.0,5.0,5.0,'Proteína',0),
  ((SELECT id FROM meal),'Morango',175.0,'g','unidade',7.0::numeric,32.0,0.7,7.3,0.3,'Fruta',1)
ON CONFLICT DO NOTHING;

-- 10:00 Colação — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Colação — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Clara de ovo cozida',68.0,'g','unidade',2.0::numeric,51.0,10.8,0.8,0.1,'Proteína',0),
  ((SELECT id FROM meal),'Iogurte natural sem lactose',170.0,'g','pote',1.0::numeric,60.0,3.5,7.0,1.5,'Laticínio',1)
ON CONFLICT DO NOTHING;

-- 12:30 Almoço (Escondidinho de Abóbora)
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Almoço' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Peito de frango cozido',150.0,'g',NULL,NULL::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Abóbora cozida',250.0,'g',NULL,NULL::numeric,27.0,1.2,5.9,0.1,'Vegetal',1),
  ((SELECT id FROM meal),'Requeijão cremoso',15.0,'g','col. sopa',1.0::numeric,253.0,11.0,3.4,21.0,'Laticínio',2),
  ((SELECT id FROM meal),'Queijo mussarela',30.0,'g','fatia',1.0::numeric,330.0,22.0,2.4,25.4,'Laticínio',3),
  ((SELECT id FROM meal),'Alface',30.0,'g','col. servir',2.0::numeric,10.0,1.0,1.3,0.2,'Vegetal',4),
  ((SELECT id FROM meal),'Tomate',60.0,'g',NULL,NULL::numeric,18.0,0.9,3.5,0.2,'Vegetal',5),
  ((SELECT id FROM meal),'Pepino',60.0,'g',NULL,NULL::numeric,15.0,0.7,2.5,0.2,'Vegetal',6)
ON CONFLICT DO NOTHING;

-- 12:30 Almoço — Sub. 1 (Salpicão)
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Almoço — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Peito de frango cozido',150.0,'g',NULL,NULL::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Abacaxi',150.0,'g',NULL,NULL::numeric,49.0,0.8,12.5,0.1,'Fruta',1),
  ((SELECT id FROM meal),'Milho verde',115.0,'g',NULL,NULL::numeric,86.0,3.3,18.3,0.9,'Vegetal',2),
  ((SELECT id FROM meal),'Iogurte integral natural',45.0,'g','col. sopa',3.0::numeric,61.0,3.5,4.7,3.3,'Laticínio',3),
  ((SELECT id FROM meal),'Cenoura crua',50.0,'g',NULL,NULL::numeric,34.0,1.3,8.0,0.1,'Vegetal',4),
  ((SELECT id FROM meal),'Repolho roxo',40.0,'g',NULL,NULL::numeric,22.0,1.3,4.6,0.1,'Vegetal',5)
ON CONFLICT DO NOTHING;

-- 15:00 Lanche da tarde
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Lanche da tarde' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Abacaxi cru',150.0,'g',NULL,NULL::numeric,49.0,0.8,12.5,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Canela em pó',5.0,'g','col. chá',1.0::numeric,261.0,4.0,67.5,3.2,'Outro',1)
ON CONFLICT DO NOTHING;

-- 15:00 Lanche da tarde — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Lanche da tarde — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Ameixa',80.0,'g','unidade',2.0::numeric,42.0,0.6,11.0,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Maçã vermelha',100.0,'g','unidade',1.0::numeric,56.0,0.3,14.9,0.1,'Fruta',1)
ON CONFLICT DO NOTHING;

-- 17:00 Pré-treino
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Pré-treino' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Melão',200.0,'g',NULL,NULL::numeric,30.0,0.5,7.3,0.1,'Fruta',0)
ON CONFLICT DO NOTHING;

-- 17:00 Pré-treino — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Pré-treino — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Melancia',300.0,'g',NULL,NULL::numeric,33.0,0.6,8.1,0.1,'Fruta',0)
ON CONFLICT DO NOTHING;

-- 19:30 Jantar
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Jantar' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Batata-inglesa assada',80.0,'g',NULL,NULL::numeric,88.0,1.8,20.0,0.1,'Carboidrato',0),
  ((SELECT id FROM meal),'Abobrinha assada',60.0,'g',NULL,NULL::numeric,14.0,1.0,2.3,0.3,'Vegetal',1),
  ((SELECT id FROM meal),'Azeite de oliva extra virgem',8.0,'ml','col. sopa',2.0::numeric,884.0,0.0,0.0,100.0,'Gordura',2),
  ((SELECT id FROM meal),'Alface',30.0,'g','folha',3.0::numeric,10.0,1.0,1.3,0.2,'Vegetal',3),
  ((SELECT id FROM meal),'Tomate',60.0,'g',NULL,NULL::numeric,18.0,0.9,3.5,0.2,'Vegetal',4),
  ((SELECT id FROM meal),'Carne moída cozida',100.0,'g',NULL,NULL::numeric,215.0,24.3,0.0,12.8,'Proteína',5)
ON CONFLICT DO NOTHING;

-- 19:30 Jantar — Sub. 1 (Omelete + Salada)
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Esportiva — 6 Refeições com Pré-treino' AND dtm.meal_name='Jantar — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Ovo de galinha inteiro',150.0,'g','unidade',3.0::numeric,146.0,12.9,0.5,9.8,'Proteína',0),
  ((SELECT id FROM meal),'Atum em conserva (óleo)',50.0,'g',NULL,NULL::numeric,193.0,27.0,0.0,9.5,'Proteína',1),
  ((SELECT id FROM meal),'Queijo minas frescal',60.0,'g',NULL,NULL::numeric,264.0,17.4,2.8,20.2,'Laticínio',2),
  ((SELECT id FROM meal),'Couve crua',30.0,'g','folha',2.0::numeric,32.0,3.1,3.7,0.7,'Vegetal',3),
  ((SELECT id FROM meal),'Alface',30.0,'g','folha',3.0::numeric,10.0,1.0,1.3,0.2,'Vegetal',4),
  ((SELECT id FROM meal),'Acelga crua',30.0,'g',NULL,NULL::numeric,16.0,1.5,2.7,0.2,'Vegetal',5),
  ((SELECT id FROM meal),'Couve-flor crua',30.0,'g',NULL,NULL::numeric,25.0,1.9,3.0,0.3,'Vegetal',6)
ON CONFLICT DO NOTHING;
