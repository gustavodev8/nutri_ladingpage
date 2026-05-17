-- Template: Dieta Detox Proteica — 1449 kcal 6 Refeições
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES ('Dieta Detox Proteica — 1449 kcal 6 Refeições',
  'Plano rico em vegetais, frutas e proteína magra. Alta densidade nutricional, baixo processamento. PTN 32% · CHO 42% · LIP 26%.',
  'emagrecimento', 1449.0, 121.3, 159.1, 43.7, TRUE)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM diet_templates WHERE name = 'Dieta Detox Proteica — 1449 kcal 6 Refeições' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.n, m.t, m.o FROM tmpl, (VALUES
  ('Desjejum',        '06:00', 0),
  ('Colação',         '09:00', 1),
  ('Almoço',          '12:00', 2),
  ('Lanche da tarde', '15:30', 3),
  ('Jantar',          '18:30', 4),
  ('Ceia',            '20:00', 5)
) AS m(n,t,o) ON CONFLICT DO NOTHING;

-- 06:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='06:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Mamão papaia cru',200.0,'g','fatia',2.0::numeric,40.0,0.5,9.8,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Clara de ovo cozida',136.0,'g','unidade',4.0::numeric,51.0,10.8,0.8,0.1,'Proteína',1),
  ((SELECT id FROM meal),'Azeite de oliva',14.0,'ml','col. arroz',1.0::numeric,884.0,0.0,0.0,100.0,'Gordura',2)
ON CONFLICT DO NOTHING;

-- 09:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='09:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Beterraba crua',60.0,'g',NULL,NULL::numeric,37.0,1.7,7.6,0.1,'Vegetal',0),
  ((SELECT id FROM meal),'Laranja crua com casca',180.0,'g','unidade',1.0::numeric,46.0,1.0,11.5,0.1,'Fruta',1)
ON CONFLICT DO NOTHING;

-- 12:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='12:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Filé de frango grelhado',240.0,'g','bife',2.0::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Salada de folhas cruas',100.0,'g','col. arroz',1.0::numeric,15.0,1.0,2.0,0.2,'Vegetal',1),
  ((SELECT id FROM meal),'Quiabo cozido',100.0,'g',NULL,NULL::numeric,22.0,1.5,3.8,0.3,'Vegetal',2)
ON CONFLICT DO NOTHING;

-- 15:30
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='15:30' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Banana',100.0,'g','unidade',1.0::numeric,98.0,1.3,25.8,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Mamão papaia cru',200.0,'g','fatia',2.0::numeric,40.0,0.5,9.8,0.1,'Fruta',1),
  ((SELECT id FROM meal),'Maçã vermelha',152.0,'g','unidade',1.0::numeric,56.0,0.3,14.9,0.1,'Fruta',2),
  ((SELECT id FROM meal),'Canela em pó',13.0,'g','col. sopa',1.0::numeric,261.0,4.0,67.5,3.2,'Outro',3)
ON CONFLICT DO NOTHING;

-- 18:30
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='18:30' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Patinho grelhado',100.0,'g',NULL,NULL::numeric,219.0,30.7,0.0,10.0,'Proteína',0),
  ((SELECT id FROM meal),'Vagem cozida',80.0,'g',NULL,NULL::numeric,28.0,1.8,5.4,0.2,'Vegetal',1),
  ((SELECT id FROM meal),'Castanha do Pará sem sal',15.0,'g',NULL,NULL::numeric,643.0,14.3,12.3,61.4,'Gordura',2)
ON CONFLICT DO NOTHING;

-- 20:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Detox Proteica — 1449 kcal 6 Refeições' AND dtm.time_suggestion='20:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Couve crua',30.0,'g','folha',1.0::numeric,32.0,3.1,3.7,0.7,'Vegetal',0),
  ((SELECT id FROM meal),'Suco de limão',60.0,'ml',NULL,NULL::numeric,22.0,0.4,5.7,0.1,'Bebida',1),
  ((SELECT id FROM meal),'Pepino',75.0,'g','fatia',5.0::numeric,15.0,0.7,2.5,0.2,'Vegetal',2),
  ((SELECT id FROM meal),'Maçã crua com casca',120.0,'g','unidade',1.0::numeric,56.0,0.3,14.9,0.1,'Fruta',3),
  ((SELECT id FROM meal),'Água de coco',150.0,'ml',NULL,NULL::numeric,19.0,0.2,4.4,0.1,'Bebida',4)
ON CONFLICT DO NOTHING;
