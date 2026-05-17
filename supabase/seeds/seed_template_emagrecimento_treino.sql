-- Template: Dieta Emagrecimento + Treino — 6 Refeições
INSERT INTO diet_templates (name, description, strategy, total_kcal, protein_g, carbs_g, fat_g, is_active)
VALUES ('Dieta Emagrecimento + Treino — 6 Refeições',
  'Plano com pré e pós-treino estruturados. Carboidratos estratégicos ao redor do treino, proteína distribuída e gorduras boas no lanche.',
  'emagrecimento', 1380.0, 110.0, 155.0, 38.0, TRUE)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM diet_templates WHERE name = 'Dieta Emagrecimento + Treino — 6 Refeições' LIMIT 1)
INSERT INTO diet_template_meals (template_id, meal_name, time_suggestion, order_index)
SELECT tmpl.id, m.n, m.t, m.o FROM tmpl, (VALUES
  ('Café da manhã',   '07:30', 0),
  ('Lanche da manhã', '09:30', 1),
  ('Almoço',          '12:00', 2),
  ('Lanche da tarde', '15:00', 3),
  ('Pré-treino',      '17:00', 4),
  ('Pós-treino',      '19:30', 5)
) AS m(n, t, o) ON CONFLICT DO NOTHING;

-- 07:30
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='07:30' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Café coado (sem açúcar)',200.0,'ml','xícara',1.0::numeric,2.0,0.3,0.0,0.0,'Bebida',0),
  ((SELECT id FROM meal),'Batata cozida',70.0,'g',NULL,NULL::numeric,52.0,1.2,12.0,0.1,'Carboidrato',1),
  ((SELECT id FROM meal),'Ovo de galinha cozido',100.0,'g','unidade',2.0::numeric,146.0,12.9,0.5,9.8,'Proteína',2)
ON CONFLICT DO NOTHING;

-- 09:30
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='09:30' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Iogurte natural',200.0,'g','pote',1.0::numeric,51.0,4.1,6.0,1.3,'Laticínio',0),
  ((SELECT id FROM meal),'Granola',15.0,'g','col. sopa',1.0::numeric,394.0,8.9,65.0,12.2,'Carboidrato',1)
ON CONFLICT DO NOTHING;

-- 12:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='12:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Filé de frango grelhado',120.0,'g','bife',1.0::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Alface',30.0,'g','folha',3.0::numeric,10.0,1.0,1.3,0.2,'Vegetal',1),
  ((SELECT id FROM meal),'Quiabo cozido',30.0,'g','col. sopa',2.0::numeric,22.0,1.5,3.8,0.3,'Vegetal',2),
  ((SELECT id FROM meal),'Couve cozida',30.0,'g','col. sopa',2.0::numeric,19.0,1.7,1.8,0.5,'Vegetal',3),
  ((SELECT id FROM meal),'Arroz branco cozido',60.0,'g','col. sopa',2.0::numeric,128.0,2.5,28.1,0.2,'Carboidrato',4),
  ((SELECT id FROM meal),'Feijão carioca cozido',60.0,'g','col. sopa',2.0::numeric,76.0,4.8,13.6,0.5,'Leguminosa',5)
ON CONFLICT DO NOTHING;

-- 15:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='15:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Castanha de caju torrada sem sal',30.0,'g','unidade',20.0::numeric,570.0,18.5,29.1,46.3,'Gordura',0)
ON CONFLICT DO NOTHING;

-- 17:00
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='17:00' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Peito de frango cozido sem pele',60.0,'g','col. sopa',3.0::numeric,159.0,32.0,0.0,3.0,'Proteína',0),
  ((SELECT id FROM meal),'Goma de tapioca',45.0,'g','col. sopa',3.0::numeric,340.0,0.2,85.0,0.0,'Carboidrato',1),
  ((SELECT id FROM meal),'Suco de laranja natural',200.0,'ml','copo',1.0::numeric,45.0,0.7,10.4,0.1,'Bebida',2)
ON CONFLICT DO NOTHING;

-- 19:30
WITH meal AS (SELECT dtm.id FROM diet_template_meals dtm JOIN diet_templates dt ON dt.id=dtm.template_id
  WHERE dt.name='Dieta Emagrecimento + Treino — 6 Refeições' AND dtm.time_suggestion='19:30' LIMIT 1)
INSERT INTO diet_template_foods (template_meal_id,food_name,quantity,unit,household_measure,measure_amount,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,food_group,order_index) VALUES
  ((SELECT id FROM meal),'Clara de ovo cozida',68.0,'g','unidade',2.0::numeric,51.0,10.8,0.8,0.1,'Proteína',0),
  ((SELECT id FROM meal),'Peito de frango cozido sem pele',60.0,'g','col. sopa',3.0::numeric,159.0,32.0,0.0,3.0,'Proteína',1),
  ((SELECT id FROM meal),'Banana cozida',100.0,'g','unidade',1.0::numeric,98.0,1.3,25.8,0.1,'Fruta',2)
ON CONFLICT DO NOTHING;
