-- Add more exercises with videos and detailed instructions
INSERT INTO exercises (name, muscle_group, description, instructions, video_url, difficulty, equipment, is_system) VALUES
-- PEITO (mais exercícios)
('Supino Declinado com Barra', 'Peito', 'Trabalha a parte inferior do peitoral', 'Deite no banco declinado, desça a barra até a parte inferior do peito e empurre para cima. Mantenha os cotovelos a 45 graus do corpo.', 'https://www.youtube.com/watch?v=LfyQBUKR8SE', 'Intermediário', 'Barra e banco', true),
('Pullover com Halter', 'Peito', 'Expande a caixa torácica e trabalha peito e costas', 'Deite transversalmente no banco, segure o halter acima do peito e desça atrás da cabeça mantendo os braços levemente flexionados.', 'https://www.youtube.com/watch?v=FK4rHfWKEac', 'Intermediário', 'Halter e banco', true),
('Supino na Máquina', 'Peito', 'Versão segura e controlada do supino', 'Sente-se na máquina, empurre as barras para frente e retorne de forma controlada.', 'https://www.youtube.com/watch?v=xUm0BiZCWlQ', 'Iniciante', 'Máquina', true),
('Flexão Diamante', 'Peito', 'Variação que foca mais no tríceps e peito interno', 'Posição de flexão com as mãos formando um diamante sob o peito. Desça e suba controladamente.', 'https://www.youtube.com/watch?v=J0DnG1_S92I', 'Avançado', 'Peso corporal', true),

-- COSTAS (mais exercícios)
('Barra Fixa (Pull-up)', 'Costas', 'Exercício clássico para dorsais', 'Segure a barra com pegada pronada, puxe o corpo até o queixo passar a barra. Desça controladamente.', 'https://www.youtube.com/watch?v=eGo4IYlbE5g', 'Avançado', 'Barra fixa', true),
('Remada T com Barra', 'Costas', 'Excelente para espessura das costas', 'Posicione a barra em um canto, segure pela ponta e puxe até o peito mantendo o tronco inclinado.', 'https://www.youtube.com/watch?v=j3Igk5nyZE4', 'Intermediário', 'Barra', true),
('Pull-down com Corda', 'Costas', 'Trabalha a parte inferior dos dorsais', 'Segure a corda na polia alta, puxe para baixo separando as pontas ao final do movimento.', 'https://www.youtube.com/watch?v=lueEJGjTuPQ', 'Iniciante', 'Polia', true),
('Levantamento Terra', 'Costas', 'Exercício composto para toda cadeia posterior', 'Pés na largura dos ombros, segure a barra, mantenha as costas retas e levante usando quadris e pernas.', 'https://www.youtube.com/watch?v=ytGaGIn3SjE', 'Avançado', 'Barra', true),
('Hiperextensão', 'Costas', 'Fortalece a lombar', 'No banco 45 graus, desça o tronco e suba contraindo a lombar. Mantenha movimento controlado.', 'https://www.youtube.com/watch?v=ph3pddpKzzw', 'Iniciante', 'Banco 45°', true),

-- OMBROS (mais exercícios)
('Arnold Press', 'Ombros', 'Variação que trabalha todas as cabeças do deltóide', 'Inicie com halteres na altura do peito, palmas para você. Gire enquanto empurra para cima.', 'https://www.youtube.com/watch?v=6Z15_WdXmVw', 'Intermediário', 'Halteres', true),
('Desenvolvimento Militar com Barra', 'Ombros', 'Clássico para força nos ombros', 'Em pé, segure a barra na altura dos ombros e empurre para cima. Mantenha core contraído.', 'https://www.youtube.com/watch?v=2yjwXTZQDDI', 'Intermediário', 'Barra', true),
('Elevação Posterior Curvado', 'Ombros', 'Isola o deltóide posterior', 'Incline o tronco a 90 graus, eleve os halteres lateralmente mantendo cotovelos levemente flexionados.', 'https://www.youtube.com/watch?v=ttvfGg9d76c', 'Intermediário', 'Halteres', true),
('Encolhimento com Halteres', 'Ombros', 'Trabalha os trapézios', 'Em pé, segure os halteres ao lado do corpo e eleve os ombros em direção às orelhas.', 'https://www.youtube.com/watch?v=cJRVVxmytaM', 'Iniciante', 'Halteres', true),

-- BÍCEPS (mais exercícios)
('Rosca Inclinada', 'Bíceps', 'Maior amplitude e estiramento do bíceps', 'Deite em banco inclinado a 45 graus, deixe os braços pendentes e flexione alternadamente.', 'https://www.youtube.com/watch?v=soxrZlIl35U', 'Intermediário', 'Halteres e banco', true),
('Rosca no Cabo', 'Bíceps', 'Tensão constante durante todo movimento', 'Na polia baixa, segure a barra e flexione os cotovelos mantendo os braços junto ao corpo.', 'https://www.youtube.com/watch?v=NFzTWp2qpiE', 'Iniciante', 'Polia', true),
('Rosca 21', 'Bíceps', 'Técnica intensiva para bíceps', '7 repetições parciais baixas + 7 parciais altas + 7 completas. Sem descanso entre séries.', 'https://www.youtube.com/watch?v=3QGPwBVW43A', 'Avançado', 'Barra ou halteres', true),

-- TRÍCEPS (mais exercícios)
('Tríceps Pulley com Barra', 'Tríceps', 'Clássico para tríceps', 'Na polia alta, empurre a barra para baixo estendendo completamente os cotovelos.', 'https://www.youtube.com/watch?v=2-LAMcpzODU', 'Iniciante', 'Polia', true),
('Tríceps Pulley com Corda', 'Tríceps', 'Permite maior contração final', 'Na polia alta com corda, empurre para baixo separando as pontas no final.', 'https://www.youtube.com/watch?v=kiuVA0gs3EI', 'Iniciante', 'Polia', true),
('Tríceps Testa (Skull Crusher)', 'Tríceps', 'Isola a cabeça longa do tríceps', 'Deite no banco, desça a barra até a testa e estenda os braços. Mantenha cotovelos fixos.', 'https://www.youtube.com/watch?v=d_KZxkY_0cM', 'Intermediário', 'Barra e banco', true),
('Tríceps Francês', 'Tríceps', 'Trabalha a cabeça longa do tríceps', 'Sentado ou em pé, segure halter atrás da cabeça e estenda os braços para cima.', 'https://www.youtube.com/watch?v=nRiJVZDpdL0', 'Intermediário', 'Halter', true),
('Mergulho no Banco', 'Tríceps', 'Exercício com peso corporal para tríceps', 'Apoie as mãos no banco atrás de você, desça o corpo flexionando os cotovelos e suba.', 'https://www.youtube.com/watch?v=6kALZikXxLc', 'Iniciante', 'Banco', true),
('Mergulho nas Paralelas', 'Tríceps', 'Exercício avançado para tríceps e peito', 'Nas barras paralelas, desça o corpo até 90 graus nos cotovelos e suba. Tronco reto foca tríceps.', 'https://www.youtube.com/watch?v=dX_nSOOJIsE', 'Avançado', 'Barras paralelas', true),

-- PERNAS - QUADRÍCEPS
('Agachamento Livre', 'Pernas', 'Rei dos exercícios para pernas', 'Barra nos ombros, pés na largura dos ombros, desça até coxas paralelas ao chão. Joelhos na direção dos pés.', 'https://www.youtube.com/watch?v=ultWZbUMPL8', 'Intermediário', 'Barra', true),
('Agachamento no Smith', 'Pernas', 'Versão guiada do agachamento', 'Na máquina Smith, pés ligeiramente à frente, desça controladamente e suba.', 'https://www.youtube.com/watch?v=IGBEbd0xmVE', 'Iniciante', 'Smith', true),
('Leg Press 45°', 'Pernas', 'Trabalha quadríceps com segurança', 'Sente-se na máquina, pés no meio da plataforma, desça até 90 graus nos joelhos e empurre.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', 'Iniciante', 'Leg press', true),
('Cadeira Extensora', 'Pernas', 'Isola o quadríceps', 'Sente-se na máquina, estenda as pernas completamente e retorne controladamente.', 'https://www.youtube.com/watch?v=YyvSfVjQeL0', 'Iniciante', 'Máquina', true),
('Hack Squat', 'Pernas', 'Agachamento na máquina', 'Apoie os ombros, desça controladamente e suba empurrando com os calcanhares.', 'https://www.youtube.com/watch?v=0tn5K9NlCfo', 'Intermediário', 'Máquina', true),
('Avanço (Lunge)', 'Pernas', 'Excelente para quadríceps e glúteos', 'Dê um passo à frente, desça até o joelho quase tocar o chão e retorne. Alterne as pernas.', 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', 'Intermediário', 'Halteres ou peso corporal', true),
('Agachamento Búlgaro', 'Pernas', 'Unilateral para força e equilíbrio', 'Pé traseiro no banco, desça até 90 graus no joelho da frente. Mantenha tronco ereto.', 'https://www.youtube.com/watch?v=2C-uNgKwPLE', 'Avançado', 'Halteres e banco', true),

-- PERNAS - POSTERIOR E GLÚTEOS
('Mesa Flexora', 'Pernas', 'Isola os isquiotibiais', 'Deite na máquina, flexione as pernas até os calcanhares tocarem os glúteos.', 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', 'Iniciante', 'Máquina', true),
('Cadeira Flexora', 'Pernas', 'Versão sentada para posterior de coxa', 'Sentado, flexione as pernas para baixo e retorne controladamente.', 'https://www.youtube.com/watch?v=Orxowest56U', 'Iniciante', 'Máquina', true),
('Stiff (Levantamento Terra Romeno)', 'Pernas', 'Foco em posterior e glúteos', 'Pernas levemente flexionadas, desça a barra mantendo costas retas até sentir alongar posterior.', 'https://www.youtube.com/watch?v=JCXUYuzwNrM', 'Intermediário', 'Barra ou halteres', true),
('Glúteo na Máquina (Gluteus)', 'Glúteos', 'Isola os glúteos', 'Na máquina, empurre a plataforma para trás contraindo o glúteo. Mantenha core contraído.', 'https://www.youtube.com/watch?v=7sIgH2d9QmQ', 'Iniciante', 'Máquina', true),
('Elevação Pélvica (Hip Thrust)', 'Glúteos', 'Melhor exercício para glúteos', 'Apoie a parte superior das costas no banco, barra no quadril, eleve o quadril contraindo glúteos.', 'https://www.youtube.com/watch?v=SEdqd1n0cvg', 'Intermediário', 'Barra e banco', true),
('Abdução de Quadril', 'Glúteos', 'Trabalha glúteo médio', 'Na máquina ou com elástico, afaste as pernas lateralmente e retorne controladamente.', 'https://www.youtube.com/watch?v=QX6Yqy_iCSo', 'Iniciante', 'Máquina ou elástico', true),
('Coice na Polia', 'Glúteos', 'Isola glúteo máximo', 'Na polia baixa com tornozeleira, chute para trás mantendo a perna estendida. Contraia o glúteo no topo.', 'https://www.youtube.com/watch?v=FvLPHcMZ_B4', 'Iniciante', 'Polia', true),
('Panturrilha em Pé', 'Pernas', 'Trabalha gastrocnêmio', 'Na máquina ou com barra, eleve os calcanhares ficando na ponta dos pés e desça.', 'https://www.youtube.com/watch?v=c5Kv6-fnTj0', 'Iniciante', 'Máquina ou barra', true),
('Panturrilha Sentado', 'Pernas', 'Trabalha sóleo', 'Sentado na máquina, eleve os calcanhares e desça alongando bem.', 'https://www.youtube.com/watch?v=JbyjNymZOt0', 'Iniciante', 'Máquina', true),

-- ABDÔMEN
('Abdominal Crunch', 'Abdômen', 'Clássico para reto abdominal', 'Deite com joelhos flexionados, mãos atrás da cabeça, eleve os ombros do chão contraindo o abdômen.', 'https://www.youtube.com/watch?v=Xyd_fa5zoEU', 'Iniciante', 'Peso corporal', true),
('Prancha Frontal', 'Abdômen', 'Isométrico para core completo', 'Apoie antebraços e pontas dos pés, mantenha corpo reto. Segure a posição sem deixar quadril cair.', 'https://www.youtube.com/watch?v=ASdvN_XEl_c', 'Iniciante', 'Peso corporal', true),
('Prancha Lateral', 'Abdômen', 'Trabalha oblíquos', 'Apoie um antebraço e lateral do pé, mantenha corpo alinhado. Segure e troque de lado.', 'https://www.youtube.com/watch?v=K2VljzCC16g', 'Intermediário', 'Peso corporal', true),
('Abdominal Bicicleta', 'Abdômen', 'Trabalha reto e oblíquos', 'Deite, mãos atrás da cabeça, leve cotovelo ao joelho oposto alternando em movimento de pedalar.', 'https://www.youtube.com/watch?v=9FGilxCbdz8', 'Intermediário', 'Peso corporal', true),
('Elevação de Pernas', 'Abdômen', 'Foco no abdômen inferior', 'Deite com mãos sob os glúteos, eleve as pernas estendidas até 90 graus e desça sem tocar o chão.', 'https://www.youtube.com/watch?v=JB2oyawG9KI', 'Intermediário', 'Peso corporal', true),
('Abdominal na Máquina', 'Abdômen', 'Permite adicionar carga ao abdominal', 'Sentado na máquina, flexione o tronco para frente contraindo o abdômen.', 'https://www.youtube.com/watch?v=3k6jhiN6BCw', 'Iniciante', 'Máquina', true),
('Russian Twist', 'Abdômen', 'Excelente para oblíquos', 'Sentado, pernas elevadas, gire o tronco de um lado para outro segurando peso.', 'https://www.youtube.com/watch?v=wkD8rjkodUI', 'Intermediário', 'Peso ou medicine ball', true),
('Mountain Climbers', 'Abdômen', 'Cardio + core', 'Posição de prancha alta, alterne trazendo joelhos ao peito rapidamente.', 'https://www.youtube.com/watch?v=nmwgirgXLYM', 'Intermediário', 'Peso corporal', true),

-- CARDIO
('Corrida na Esteira', 'Cardio', 'Cardio clássico para queima de gordura', 'Ajuste velocidade e inclinação conforme condicionamento. Mantenha postura ereta e respiração controlada.', 'https://www.youtube.com/watch?v=8rN3NqNfS5c', 'Iniciante', 'Esteira', true),
('Bicicleta Ergométrica', 'Cardio', 'Baixo impacto nas articulações', 'Ajuste banco e resistência, mantenha cadência constante. Ótimo para iniciantes.', 'https://www.youtube.com/watch?v=4eXonxH2S_w', 'Iniciante', 'Bicicleta', true),
('Elíptico', 'Cardio', 'Trabalha corpo inteiro com baixo impacto', 'Movimente braços e pernas em sincronia, ajuste resistência conforme necessário.', 'https://www.youtube.com/watch?v=B8DXKF3oRoQ', 'Iniciante', 'Elíptico', true),
('Pular Corda', 'Cardio', 'Alta queima calórica em pouco tempo', 'Salte com a ponta dos pés, corda passando sob os pés. Mantenha cotovelos junto ao corpo.', 'https://www.youtube.com/watch?v=FJmRQ5iTXKE', 'Intermediário', 'Corda', true),
('Burpee', 'Cardio', 'Exercício funcional completo', 'Agache, mãos no chão, pule para prancha, flexão, retorne e salte com braços para cima.', 'https://www.youtube.com/watch?v=TU8QYVW0gDU', 'Avançado', 'Peso corporal', true),
('Jumping Jacks', 'Cardio', 'Aquecimento e cardio leve', 'Salte abrindo pernas e braços simultaneamente, retorne à posição inicial.', 'https://www.youtube.com/watch?v=-QDl7CYqRck', 'Iniciante', 'Peso corporal', true),
('HIIT na Esteira', 'Cardio', 'Intervalos de alta intensidade', 'Alterne 30s corrida intensa com 60s caminhada. Repita por 15-20 minutos.', 'https://www.youtube.com/watch?v=ml6cT4AZdqI', 'Avançado', 'Esteira', true),
('Escalador', 'Cardio', 'Simula escalada', 'Na máquina escaladora, movimente pernas e braços alternadamente em ritmo constante.', 'https://www.youtube.com/watch?v=3WRKR9YT5CY', 'Intermediário', 'Escaladora', true),
('Box Jump', 'Cardio', 'Potência e explosão', 'Salte sobre a caixa com os dois pés, estenda quadris no topo, desça controladamente.', 'https://www.youtube.com/watch?v=NBY9-kTuHEk', 'Avançado', 'Caixa', true),
('Battle Ropes', 'Cardio', 'Trabalha braços e core com cardio', 'Segure as cordas e faça ondas alternadas ou simultâneas. Mantenha core contraído.', 'https://www.youtube.com/watch?v=WH3Q5rLlZC8', 'Intermediário', 'Cordas', true)

ON CONFLICT (id) DO NOTHING;

-- Create weekly_goals table for the goals system
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  goal_type VARCHAR(50) NOT NULL, -- 'workouts', 'hydration', 'weight', 'calories', 'exercises'
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, week_start, goal_type)
);

-- Enable RLS
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own weekly goals" ON public.weekly_goals
FOR ALL USING (profile_id = get_current_profile_id())
WITH CHECK (profile_id = get_current_profile_id());

CREATE POLICY "Instructors can view linked client goals" ON public.weekly_goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM instructor_clients ic
    WHERE ic.instructor_id = get_current_profile_id()
    AND ic.client_id = weekly_goals.profile_id
    AND ic.is_active = true
  )
);

-- Create motivational_notifications table
CREATE TABLE IF NOT EXISTS public.motivational_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'goal_progress', 'goal_completed', 'streak', 'encouragement'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motivational_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own motivational notifications" ON public.motivational_notifications
FOR ALL USING (profile_id = get_current_profile_id())
WITH CHECK (profile_id = get_current_profile_id());

-- Create trigger to update weekly_goals updated_at
CREATE OR REPLACE FUNCTION update_weekly_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_goals_timestamp
BEFORE UPDATE ON public.weekly_goals
FOR EACH ROW EXECUTE FUNCTION update_weekly_goals_updated_at();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_goals_profile_week ON public.weekly_goals(profile_id, week_start);
CREATE INDEX IF NOT EXISTS idx_motivational_notifications_profile ON public.motivational_notifications(profile_id, is_read);