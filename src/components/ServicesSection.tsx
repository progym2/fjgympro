import { motion } from "framer-motion";
import { Dumbbell, Users, Clock, Heart, Trophy, Zap } from "lucide-react";

const services = [
  {
    icon: Dumbbell,
    title: "Musculação",
    description:
      "Equipamentos de última geração para treinos de força e hipertrofia.",
  },
  {
    icon: Users,
    title: "Aulas em Grupo",
    description:
      "Spinning, funcional, yoga, pilates e muito mais em turmas motivadoras.",
  },
  {
    icon: Clock,
    title: "24 Horas",
    description:
      "Academia aberta 24h para você treinar no seu horário preferido.",
  },
  {
    icon: Heart,
    title: "Avaliação Física",
    description:
      "Acompanhamento personalizado com avaliações periódicas completas.",
  },
  {
    icon: Trophy,
    title: "Personal Trainer",
    description:
      "Treinadores especializados para acelerar seus resultados.",
  },
  {
    icon: Zap,
    title: "Nutrição Esportiva",
    description:
      "Orientação nutricional para otimizar seu desempenho e resultados.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const ServicesSection = () => {
  return (
    <section id="services" className="py-24 bg-gradient-dark">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium tracking-wider uppercase">
            Nossos Serviços
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-4">
            TUDO QUE VOCÊ <span className="text-gradient">PRECISA</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Uma estrutura completa pensada para oferecer a melhor experiência
            fitness da região.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative bg-gradient-card border border-border rounded-xl p-8 hover:border-primary/50 transition-all duration-500 hover:shadow-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              <div className="relative">
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3 group-hover:text-primary transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-muted-foreground">{service.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
