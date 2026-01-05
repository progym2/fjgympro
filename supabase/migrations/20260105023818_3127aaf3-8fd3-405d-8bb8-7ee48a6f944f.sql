-- Popular biblioteca de exercícios com vídeos do YouTube otimizados
INSERT INTO public.exercises (name, description, muscle_group, equipment, video_url, instructions, difficulty, is_system) VALUES
-- PEITO
('Supino Reto com Barra', 'Exercício fundamental para desenvolvimento do peitoral', 'Peito', 'Barra e banco', 'https://www.youtube.com/watch?v=rT7DgCr-3pg', 'Deite no banco, segure a barra na largura dos ombros, desça até o peito e empurre para cima.', 'Intermediário', true),
('Supino Inclinado com Halteres', 'Foca na parte superior do peitoral', 'Peito', 'Halteres e banco inclinado', 'https://www.youtube.com/watch?v=8iPEnn-ltC8', 'Banco inclinado a 30-45 graus, desça os halteres até o nível do peito e empurre para cima.', 'Intermediário', true),
('Crucifixo com Halteres', 'Excelente para abertura e alongamento do peitoral', 'Peito', 'Halteres e banco', 'https://www.youtube.com/watch?v=eozdVDA78K0', 'Deite no banco, abra os braços em arco mantendo leve flexão nos cotovelos.', 'Iniciante', true),
('Flexão de Braços', 'Exercício básico usando peso corporal', 'Peito', 'Peso corporal', 'https://www.youtube.com/watch?v=IODxDxX7oi4', 'Posição de prancha, desça o corpo flexionando os cotovelos e empurre para cima.', 'Iniciante', true),
('Crossover na Polia', 'Isolamento do peitoral com cabos', 'Peito', 'Polia/Cabo', 'https://www.youtube.com/watch?v=taI4XduLpTk', 'Posicione-se entre as polias, puxe os cabos cruzando na frente do corpo.', 'Intermediário', true),

-- COSTAS
('Puxada Frontal', 'Exercício principal para largura das costas', 'Costas', 'Polia alta', 'https://www.youtube.com/watch?v=CAwf7n6Luuc', 'Segure a barra larga, puxe até o peito contraindo as escápulas.', 'Iniciante', true),
('Remada Curvada com Barra', 'Desenvolvimento da espessura das costas', 'Costas', 'Barra', 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ', 'Incline o tronco, puxe a barra até o abdômen mantendo as costas retas.', 'Intermediário', true),
('Remada Unilateral com Halter', 'Trabalha cada lado das costas separadamente', 'Costas', 'Halter e banco', 'https://www.youtube.com/watch?v=pYcpY20QaE8', 'Apoie um joelho no banco, puxe o halter até a cintura.', 'Iniciante', true),
('Pulldown com Pegada Supinada', 'Foco no latíssimo e bíceps', 'Costas', 'Polia alta', 'https://www.youtube.com/watch?v=JGeRYIZdojU', 'Pegada invertida (palmas para você), puxe até o peito.', 'Iniciante', true),
('Remada na Máquina', 'Ótimo para iniciantes com movimento controlado', 'Costas', 'Máquina', 'https://www.youtube.com/watch?v=xQNrFHEMhI4', 'Sente-se na máquina, puxe os cabos até o abdômen.', 'Iniciante', true),

-- OMBROS
('Desenvolvimento com Halteres', 'Exercício principal para ombros', 'Ombros', 'Halteres', 'https://www.youtube.com/watch?v=qEwKCR5JCog', 'Sentado ou em pé, empurre os halteres acima da cabeça.', 'Intermediário', true),
('Elevação Lateral', 'Isola o deltóide lateral', 'Ombros', 'Halteres', 'https://www.youtube.com/watch?v=3VcKaXpzqRo', 'Braços ao lado, eleve lateralmente até a altura dos ombros.', 'Iniciante', true),
('Elevação Frontal', 'Trabalha o deltóide anterior', 'Ombros', 'Halteres ou barra', 'https://www.youtube.com/watch?v=-t7fuZ0KhDA', 'Eleve os braços à frente até a altura dos ombros.', 'Iniciante', true),
('Remada Alta', 'Trabalha ombros e trapézio', 'Ombros', 'Barra ou halteres', 'https://www.youtube.com/watch?v=um3VVzqunPU', 'Puxe a barra verticalmente próximo ao corpo até o queixo.', 'Intermediário', true),
('Face Pull', 'Excelente para deltóide posterior e postura', 'Ombros', 'Polia/Cabo', 'https://www.youtube.com/watch?v=rep-qVOkqgk', 'Puxe o cabo em direção ao rosto, abrindo os cotovelos.', 'Iniciante', true),

-- BÍCEPS
('Rosca Direta com Barra', 'Exercício clássico para bíceps', 'Bíceps', 'Barra', 'https://www.youtube.com/watch?v=kwG2ipFRgfo', 'Segure a barra com pegada supinada, flexione os cotovelos.', 'Iniciante', true),
('Rosca Alternada com Halteres', 'Permite maior amplitude e concentração', 'Bíceps', 'Halteres', 'https://www.youtube.com/watch?v=sAq_ocpRh_I', 'Alterne a flexão dos braços com rotação do punho.', 'Iniciante', true),
('Rosca Martelo', 'Trabalha bíceps e antebraço', 'Bíceps', 'Halteres', 'https://www.youtube.com/watch?v=zC3nLlEvin4', 'Pegada neutra (martelo), flexione os cotovelos.', 'Iniciante', true),
('Rosca Concentrada', 'Máximo isolamento do bíceps', 'Bíceps', 'Halter', 'https://www.youtube.com/watch?v=0AUGkch3tzc', 'Sentado, apoie o cotovelo na coxa interna e flexione.', 'Intermediário', true),
('Rosca Scott', 'Isola o bíceps no banco Scott', 'Bíceps', 'Barra ou halteres', 'https://www.youtube.com/watch?v=soxrZlIl35U', 'Apoie os braços no banco Scott e flexione.', 'Intermediário', true),

-- TRÍCEPS
('Tríceps na Polia', 'Exercício de isolamento para tríceps', 'Tríceps', 'Polia/Cabo', 'https://www.youtube.com/watch?v=2-LAMcpzODU', 'Empurre a barra para baixo estendendo os cotovelos.', 'Iniciante', true),
('Tríceps Francês', 'Trabalha a cabeça longa do tríceps', 'Tríceps', 'Halter ou barra', 'https://www.youtube.com/watch?v=_gsUck-7M74', 'Deitado, desça o peso atrás da cabeça e estenda.', 'Intermediário', true),
('Tríceps Testa', 'Excelente para massa do tríceps', 'Tríceps', 'Barra ou halteres', 'https://www.youtube.com/watch?v=d_KZxkY_0cM', 'Deitado, desça a barra até a testa e estenda.', 'Intermediário', true),
('Mergulho no Banco', 'Exercício com peso corporal', 'Tríceps', 'Banco', 'https://www.youtube.com/watch?v=6kALZikXxLc', 'Mãos no banco, desça o corpo flexionando os cotovelos.', 'Iniciante', true),
('Kickback com Halter', 'Isolamento do tríceps', 'Tríceps', 'Halter', 'https://www.youtube.com/watch?v=6SS6K3lAwZ8', 'Inclinado, estenda o braço para trás.', 'Iniciante', true),

-- PERNAS
('Agachamento Livre', 'Rei dos exercícios para pernas', 'Pernas', 'Barra', 'https://www.youtube.com/watch?v=aclHkVaku9U', 'Barra nas costas, agache até as coxas ficarem paralelas ao chão.', 'Avançado', true),
('Leg Press', 'Exercício seguro para quadríceps', 'Pernas', 'Máquina Leg Press', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', 'Empurre a plataforma estendendo as pernas.', 'Iniciante', true),
('Cadeira Extensora', 'Isola o quadríceps', 'Pernas', 'Máquina extensora', 'https://www.youtube.com/watch?v=YyvSfVjQeL0', 'Estenda as pernas contra a resistência.', 'Iniciante', true),
('Mesa Flexora', 'Isola os isquiotibiais', 'Pernas', 'Máquina flexora', 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', 'Flexione as pernas puxando o peso.', 'Iniciante', true),
('Stiff', 'Trabalha posterior de coxa e glúteos', 'Pernas', 'Barra ou halteres', 'https://www.youtube.com/watch?v=1uDiW5--rAE', 'Incline o tronco mantendo as pernas semi-estendidas.', 'Intermediário', true),
('Panturrilha em Pé', 'Desenvolvimento das panturrilhas', 'Pernas', 'Máquina ou peso livre', 'https://www.youtube.com/watch?v=gwLzBJYoWlI', 'Eleve os calcanhares contraindo as panturrilhas.', 'Iniciante', true),
('Afundo/Passada', 'Trabalha pernas e glúteos unilateralmente', 'Pernas', 'Halteres ou peso corporal', 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', 'Dê um passo à frente e agache, alternando as pernas.', 'Intermediário', true),

-- ABDÔMEN
('Abdominal Crunch', 'Exercício básico para abdômen', 'Abdômen', 'Peso corporal', 'https://www.youtube.com/watch?v=Xyd_fa5zoEU', 'Deitado, eleve os ombros do chão contraindo o abdômen.', 'Iniciante', true),
('Prancha', 'Fortalece o core isometricamente', 'Abdômen', 'Peso corporal', 'https://www.youtube.com/watch?v=ASdvN_XEl_c', 'Mantenha o corpo reto apoiado nos antebraços e pés.', 'Iniciante', true),
('Elevação de Pernas', 'Trabalha abdômen inferior', 'Abdômen', 'Barra fixa ou banco', 'https://www.youtube.com/watch?v=JB2oyawG9KI', 'Pendurado ou deitado, eleve as pernas estendidas.', 'Intermediário', true),
('Abdominal Bicicleta', 'Trabalha oblíquos com movimento dinâmico', 'Abdômen', 'Peso corporal', 'https://www.youtube.com/watch?v=9FGilxCbdz8', 'Alterne cotovelo e joelho oposto em movimento de pedalar.', 'Intermediário', true),
('Russian Twist', 'Rotação para oblíquos', 'Abdômen', 'Peso ou medicine ball', 'https://www.youtube.com/watch?v=wkD8rjkodUI', 'Sentado com tronco inclinado, gire de um lado ao outro.', 'Intermediário', true),

-- GLÚTEOS
('Hip Thrust', 'Melhor exercício para glúteos', 'Glúteos', 'Barra e banco', 'https://www.youtube.com/watch?v=SEdqd1n0cvg', 'Costas apoiadas no banco, eleve o quadril com a barra.', 'Intermediário', true),
('Glúteo na Máquina', 'Isolamento dos glúteos', 'Glúteos', 'Máquina', 'https://www.youtube.com/watch?v=LfRtS0lNBqI', 'Empurre a plataforma para trás com uma perna.', 'Iniciante', true),
('Abdução de Quadril', 'Trabalha glúteo médio', 'Glúteos', 'Máquina ou cabo', 'https://www.youtube.com/watch?v=KxEYX5XZL-o', 'Abra as pernas contra a resistência.', 'Iniciante', true),
('Ponte de Glúteos', 'Versão básica do hip thrust', 'Glúteos', 'Peso corporal', 'https://www.youtube.com/watch?v=8bbE64NuDTU', 'Deitado, eleve o quadril contraindo os glúteos.', 'Iniciante', true),
('Coice na Polia', 'Extensão de quadril com cabo', 'Glúteos', 'Polia baixa', 'https://www.youtube.com/watch?v=l7w6vR1dDCo', 'Prenda o tornozelo no cabo e estenda a perna para trás.', 'Iniciante', true),

-- CARDIO
('Corrida na Esteira', 'Cardio tradicional de baixo impacto', 'Cardio', 'Esteira', 'https://www.youtube.com/watch?v=_kGESn8ArrU', 'Mantenha postura ereta e ritmo constante.', 'Iniciante', true),
('Bicicleta Ergométrica', 'Cardio de baixo impacto para articulações', 'Cardio', 'Bicicleta ergométrica', 'https://www.youtube.com/watch?v=9J8u0qLR1w8', 'Ajuste o banco e pedale mantendo a resistência adequada.', 'Iniciante', true),
('Elíptico', 'Cardio de corpo inteiro', 'Cardio', 'Elíptico/Transport', 'https://www.youtube.com/watch?v=j8rAmH8ITMY', 'Movimento fluido de pernas e braços.', 'Iniciante', true),
('Pular Corda', 'Cardio de alta intensidade', 'Cardio', 'Corda de pular', 'https://www.youtube.com/watch?v=u3zgHI8QnqE', 'Saltos leves, corda passando sob os pés.', 'Intermediário', true),
('Burpee', 'Exercício de alta intensidade para corpo todo', 'Cardio', 'Peso corporal', 'https://www.youtube.com/watch?v=dZgVxmf6jkA', 'Agache, apoie as mãos, estenda as pernas, flexão, volte e salte.', 'Avançado', true)

ON CONFLICT DO NOTHING;