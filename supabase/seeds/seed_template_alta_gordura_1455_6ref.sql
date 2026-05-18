-- Template: Dieta Alta Gordura — 1455 kcal 6 Refeições
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES (
  'Dieta Alta Gordura — 1455 kcal 6 Refeições',
  'Plano com 6 refeições sem café da manhã convencional. Alta densidade calórica por gorduras boas (castanhas, azeite, chia). PTN 18,2% · CHO 29,6% · LIP 52,2%.',
  'low_carb', 1455.0, 66.2, 107.6, 84.4, TRUE
)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM diet_templates WHERE name = 'Dieta Alta Gordura — 1455 kcal 6 Refeições' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.n, m.t, m.o FROM tmpl, (VALUES
  ('Colação',         '10:00', 0),
  ('Almoço',          '12:30', 1),
  ('Lanche da tarde', '15:00', 2),
  ('Pré-treino',      '17:00', 3),
  ('Jantar',          '19:30', 4),
  ('Ceia',            '22:00', 5)
) AS m(n,t,o) ON CONFLICT DO NOTHING;

-- 10:00 Colação
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Colação' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Tangerina crua',       120.0,'g','unidade',  1.0::numeric, 37.0, 0.8,  9.3, 0.1,'Fruta',  0),
  ((SELECT id FROM meal),'Morango',              175.0,'g','unidade',  7.0::numeric, 32.0, 0.7,  7.3, 0.3,'Fruta',  1),
  ((SELECT id FROM meal),'Castanha de caju torrada sem sal', 35.0,'g',NULL,NULL::numeric,570.0,18.5,29.1,46.3,'Gordura',2)
ON CONFLICT DO NOTHING;

-- 12:30 Almoço
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Almoço' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Carne bovina grelhada', 120.0,'g',NULL,      NULL::numeric,219.0,30.7, 0.0,10.0,'Proteína',  0),
  ((SELECT id FROM meal),'Alface lisa crua',      100.0,'g','unidade',  1.0::numeric, 11.0, 1.3, 1.7, 0.2,'Vegetal',   1),
  ((SELECT id FROM meal),'Rúcula crua',            80.0,'g',NULL,      NULL::numeric, 25.0, 2.6, 2.4, 0.5,'Vegetal',   2),
  ((SELECT id FROM meal),'Grão-de-bico cozido',    30.0,'g','col. sopa',2.0::numeric,164.0, 8.9,27.4, 2.6,'Leguminosa',3)
ON CONFLICT DO NOTHING;

-- 15:00 Lanche da tarde
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Lanche da tarde' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Abacaxi cru',    100.0,'g','fatia', 2.0::numeric, 49.0, 0.8,12.5, 0.1,'Fruta',  0),
  ((SELECT id FROM meal),'Mix de castanhas', 35.0,'g',NULL,  NULL::numeric,590.0,16.0,18.0,50.0,'Gordura',1)
ON CONFLICT DO NOTHING;

-- 17:00 Pré-treino
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Pré-treino' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Melão cru',      100.0,'g','fatia',   2.0::numeric, 30.0, 0.5, 7.3,  0.1,'Fruta',  0),
  ((SELECT id FROM meal),'Chia em grãos',   30.0,'g','col. sopa',2.0::numeric,484.0,16.5,42.1,30.7,'Semente',1)
ON CONFLICT DO NOTHING;

-- 19:30 Jantar
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Jantar' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Ovo de galinha inteiro cozido', 50.0,'g','unidade',  1.0::numeric,146.0,12.9, 0.5, 9.8,'Proteína',   0),
  ((SELECT id FROM meal),'Alho cru',                       6.0,'g','dente',    2.0::numeric,149.0, 6.4,32.7, 0.5,'Tempero',    1),
  ((SELECT id FROM meal),'Inhame cozido',                 75.0,'g',NULL,      NULL::numeric,116.0, 1.8,27.5, 0.2,'Carboidrato',2),
  ((SELECT id FROM meal),'Azeite de oliva extra virgem',  28.0,'ml','col. sopa',2.0::numeric,884.0, 0.0, 0.0,100.0,'Gordura',  3)
ON CONFLICT DO NOTHING;

-- 22:00 Ceia
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Alta Gordura — 1455 kcal 6 Refeições' AND dtm.meal_name='Ceia' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Castanha do Pará sem sal',20.0,'g',NULL,NULL::numeric,643.0,14.3,12.3,61.4,'Gordura',0)
ON CONFLICT DO NOTHING;
