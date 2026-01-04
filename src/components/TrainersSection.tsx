import { motion } from "framer-motion";
import { Instagram, Award } from "lucide-react";
import trainer1 from "@/assets/trainer-1.jpg";
import trainer2 from "@/assets/trainer-2.jpg";
import trainer3 from "@/assets/trainer-3.jpg";

const trainers = [
  {
    name: "Bruno Silva",
    role: "Personal Trainer & CrossFit",
    image: trainer1,
    specialties: ["Hipertrofia", "CrossFit", "HIIT"],
    instagram: "@brunosilva.fit",
  },
  {
    name: "Amanda Costa",
    role: "Funcional & Dance",
    image: trainer2,
    specialties: ["Funcional", "Dance", "Emagrecimento"],
    instagram: "@amandacosta.fit",
  },
  {
    name: "Lucas Ferreira",
    role: "Musculação & Boxe",
    image: trainer3,
    specialties: ["Musculação", "Boxe", "MMA"],
    instagram: "@lucasferreira.fit",
  },
];

export const TrainersSection = () => {
  return (
    <section id="trainers" className="py-24 bg-background">
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
            Nossa Equipe
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-4">
            TREINADORES <span className="text-gradient">ESPECIALISTAS</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Profissionais certificados e apaixonados por transformar vidas
            através do fitness.
          </p>
        </motion.div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {trainers.map((trainer, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-2xl mb-6">
                <img
                  src={trainer.image}
                  alt={trainer.name}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex gap-2">
                    {trainer.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="bg-primary/80 text-primary-foreground px-2 py-1 rounded text-xs font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <a
                    href="#"
                    className="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-primary-foreground" />
                  </a>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-display text-2xl group-hover:text-primary transition-colors">
                  {trainer.name}
                </h3>
                <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
                  <Award className="w-4 h-4 text-primary" />
                  {trainer.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
