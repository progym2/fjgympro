import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Básico",
    price: "79",
    period: "/mês",
    description: "Perfeito para começar sua jornada fitness",
    features: [
      "Acesso à área de musculação",
      "Horário comercial (6h - 22h)",
      "Avaliação física inicial",
      "Acesso ao app de treinos",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "129",
    period: "/mês",
    description: "O plano mais escolhido pelos nossos alunos",
    features: [
      "Acesso 24 horas",
      "Todas as aulas em grupo",
      "Avaliação física mensal",
      "Área VIP e sauna",
      "Armário exclusivo",
      "2 sessões de personal/mês",
    ],
    popular: true,
  },
  {
    name: "Black",
    price: "249",
    period: "/mês",
    description: "Experiência fitness completa e exclusiva",
    features: [
      "Tudo do Premium",
      "Personal trainer dedicado",
      "Nutricionista incluso",
      "Acesso a todas unidades",
      "Estacionamento VIP",
      "Área exclusiva Black",
      "Suplementação básica",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-background">
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
            Nossos Planos
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-4">
            ESCOLHA SEU <span className="text-gradient">PLANO</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Planos flexíveis para atender suas necessidades. Sem taxa de
            matrícula por tempo limitado!
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 border-2 backdrop-blur-sm ${
                plan.popular
                  ? "border-primary bg-primary/10 shadow-2xl shadow-primary/20 scale-105 ring-2 ring-primary/30"
                  : "border-border/60 bg-card/95 hover:bg-card"
              } transition-all duration-300 hover:border-primary/60 hover:shadow-xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    MAIS POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-display text-3xl mb-2 text-foreground">{plan.name}</h3>
                <p className="text-foreground/70 text-sm mb-4 font-medium">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-foreground/80 text-lg font-semibold">R$</span>
                  <span className="font-display text-6xl text-gradient drop-shadow-lg">
                    {plan.price}
                  </span>
                  <span className="text-foreground/70 font-medium">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary/30 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check className="w-4 h-4 text-primary drop-shadow-sm" />
                    </div>
                    <span className="text-foreground/90 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "heroOutline"}
                size="lg"
                className="w-full"
              >
                Começar Agora
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
