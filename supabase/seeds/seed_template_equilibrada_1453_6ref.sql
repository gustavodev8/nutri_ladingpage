-- Template: Dieta Equilibrada — 1453 kcal 6 Refeições
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES (
  'Dieta Equilibrada — 1453 kcal 6 Refeições',
  'Plano com 6 refeições equilibradas. Carboidratos complexos, proteínas magras e gorduras saudáveis. Opções de substituição para cada refeição. PTN 25,6% · CHO 45,5% · LIP 28,9%.',
  'emagrecimento', 1453.0, 94.12, 167.21, 47.11, TRUE
)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM diet_templates WHERE name = 'Dieta Equilibrada — 1453 kcal 6 Refeições' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.n, m.t, m.o FROM tmpl, (VALUES
  ('Café da manhã',            '06:30',  0),
  ('Café da manhã — Sub. 1',   '06:30',  1),
  ('Colação',                  '09:00',  2),
  ('Colação — Sub. 1',         '09:00',  3),
  ('Almoço',                   '12:00',  4),
  ('Almoço — Sub. 1',          '12:00',  5),
  ('Lanche da tarde',          '15:00',  6),
  ('Lanche da tarde — Sub. 1', '15:00',  7),
  ('Jantar',                   '19:00',  8),
  ('Jantar — Sub. 1',          '19:00',  9),
  ('Ceia',                     '21:00', 10),
  ('Ceia — Sub. 1',            '21:00', 11)
) AS m(n,t,o) ON CONFLICT DO NOTHING;

-- 06:30 Café da manhã
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Café da manhã' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Cuscuz cozido',80.0,'g',NULL,NULL::numeric,71.0,2.1,15.6,0.3,'Carboidrato',0),
  ((SELECT id FROM meal),'Aveia em flocos',30.0,'g','col. sopa',2.0::numeric,394.0,13.9,66.6,8.5,'Carboidrato',1),
  ((SELECT id FROM meal),'Ovo de galinha cozido',100.0,'g','unidade',2.0::numeric,146.0,12.9,0.5,9.8,'Proteína',2),
  ((SELECT id FROM meal),'Café com leite',200.0,'ml','copo',1.0::numeric,40.0,2.0,3.5,1.5,'Bebida',3)
ON CONFLICT DO NOTHING;

-- 06:30 Café da manhã — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Café da manhã — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Pão integral',50.0,'g','fatia',2.0::numeric,240.0,9.0,43.0,4.0,'Carboidrato',0),
  ((SELECT id FROM meal),'Peito de frango cozido',45.0,'g','col. sopa',3.0::numeric,159.0,32.0,0.0,3.0,'Proteína',1),
  ((SELECT id FROM meal),'Queijo minas frescal',30.0,'g',NULL,NULL::numeric,264.0,17.4,2.8,20.2,'Laticínio',2),
  ((SELECT id FROM meal),'Café com leite',200.0,'ml','caneca',1.0::numeric,40.0,2.0,3.5,1.5,'Bebida',3),
  ((SELECT id FROM meal),'Pera',130.0,'g','unidade',1.0::numeric,53.0,0.4,14.0,0.2,'Fruta',4)
ON CONFLICT DO NOTHING;

-- 09:00 Colação
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Colação' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Castanha de caju torrada sem sal',20.0,'g',NULL,NULL::numeric,570.0,18.5,29.1,46.3,'Gordura',0)
ON CONFLICT DO NOTHING;

-- 09:00 Colação — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Colação — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Castanha do Pará sem sal',15.0,'g','unidade',5.0::numeric,643.0,14.3,12.3,61.4,'Gordura',0)
ON CONFLICT DO NOTHING;

-- 12:00 Almoço
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Almoço' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Patinho grelhado',100.0,'g',NULL,NULL::numeric,219.0,30.7,0.0,10.0,'Proteína',0),
  ((SELECT id FROM meal),'Arroz integral cozido',80.0,'g','col. sopa',3.0::numeric,124.0,2.6,25.8,1.0,'Carboidrato',1),
  ((SELECT id FROM meal),'Feijão carioca cozido',50.0,'g','col. sopa',2.0::numeric,76.0,4.8,13.6,0.5,'Leguminosa',2),
  ((SELECT id FROM meal),'Alface',30.0,'g','folha',3.0::numeric,10.0,1.0,1.3,0.2,'Vegetal',3),
  ((SELECT id FROM meal),'Tomate',50.0,'g',NULL,NULL::numeric,18.0,0.9,3.5,0.2,'Vegetal',4),
  ((SELECT id FROM meal),'Couve crua',50.0,'g',NULL,NULL::numeric,32.0,3.1,3.7,0.7,'Vegetal',5)
ON CONFLICT DO NOTHING;

-- 12:00 Almoço — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Almoço — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Peito de frango grelhado',100.0,'g',NULL,NULL::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Macarrão integral cozido',100.0,'g',NULL,NULL::numeric,144.0,6.0,27.0,1.0,'Carboidrato',1),
  ((SELECT id FROM meal),'Pepino',40.0,'g',NULL,NULL::numeric,15.0,0.7,2.5,0.2,'Vegetal',2),
  ((SELECT id FROM meal),'Repolho branco cru',40.0,'g',NULL,NULL::numeric,16.0,0.9,3.5,0.1,'Vegetal',3),
  ((SELECT id FROM meal),'Cenoura crua',50.0,'g',NULL,NULL::numeric,34.0,1.3,8.0,0.1,'Vegetal',4)
ON CONFLICT DO NOTHING;

-- 15:00 Lanche da tarde
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Lanche da tarde' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Melão',120.0,'g',NULL,NULL::numeric,30.0,0.5,7.3,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Chia em grãos',30.0,'g','col. sopa',2.0::numeric,484.0,16.5,42.1,30.7,'Semente',1)
ON CONFLICT DO NOTHING;

-- 15:00 Lanche da tarde — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Lanche da tarde — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Ameixa',80.0,'g','unidade',2.0::numeric,42.0,0.6,11.0,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Amendoim torrado sem sal',30.0,'g','col. sopa',2.0::numeric,581.0,29.0,15.5,47.5,'Gordura',1)
ON CONFLICT DO NOTHING;

-- 19:00 Jantar
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Jantar' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Goma de tapioca',45.0,'g','col. sopa',3.0::numeric,340.0,0.2,85.0,0.0,'Carboidrato',0),
  ((SELECT id FROM meal),'Peito de frango cozido',30.0,'g','col. sopa',2.0::numeric,159.0,32.0,0.0,3.0,'Proteína',1)
ON CONFLICT DO NOTHING;

-- 19:00 Jantar — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Jantar — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Aipim cozido',80.0,'g',NULL,NULL::numeric,125.0,0.6,30.0,0.3,'Carboidrato',0),
  ((SELECT id FROM meal),'Patinho grelhado sem gordura',75.0,'g',NULL,NULL::numeric,219.0,30.7,0.0,10.0,'Proteína',1)
ON CONFLICT DO NOTHING;

-- 21:00 Ceia
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Ceia' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Banana',100.0,'g','unidade',1.0::numeric,98.0,1.3,25.8,0.1,'Fruta',0),
  ((SELECT id FROM meal),'Aveia em flocos',30.0,'g','col. sopa',2.0::numeric,394.0,13.9,66.6,8.5,'Carboidrato',1)
ON CONFLICT DO NOTHING;

-- 21:00 Ceia — Sub. 1
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Equilibrada — 1453 kcal 6 Refeições' AND dtm.meal_name='Ceia — Sub. 1' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Iogurte integral natural',170.0,'g','pote',1.0::numeric,61.0,3.5,4.7,3.3,'Laticínio',0),
  ((SELECT id FROM meal),'Chia em grãos',15.0,'g','col. sopa',1.0::numeric,484.0,16.5,42.1,30.7,'Semente',1)
ON CONFLICT DO NOTHING;
