import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const schedule = [
  {
    day: "Segunda",
    classes: [
      { time: "06:00", name: "Spinning", trainer: "Carlos" },
      { time: "08:00", name: "Funcional", trainer: "Amanda" },
      { time: "10:00", name: "Yoga", trainer: "Juliana" },
      { time: "18:00", name: "HIIT", trainer: "Bruno" },
      { time: "19:30", name: "Musculação Guiada", trainer: "Lucas" },
    ],
  },
  {
    day: "Terça",
    classes: [
      { time: "06:00", name: "Funcional", trainer: "Amanda" },
      { time: "09:00", name: "Pilates", trainer: "Juliana" },
      { time: "17:00", name: "Spinning", trainer: "Carlos" },
      { time: "19:00", name: "CrossFit", trainer: "Bruno" },
      { time: "20:30", name: "Alongamento", trainer: "Amanda" },
    ],
  },
  {
    day: "Quarta",
    classes: [
      { time: "06:00", name: "HIIT", trainer: "Bruno" },
      { time: "08:00", name: "Yoga", trainer: "Juliana" },
      { time: "10:00", name: "Funcional", trainer: "Amanda" },
      { time: "18:00", name: "Spinning", trainer: "Carlos" },
      { time: "19:30", name: "Boxe", trainer: "Lucas" },
    ],
  },
  {
    day: "Quinta",
    classes: [
      { time: "06:00", name: "Spinning", trainer: "Carlos" },
      { time: "09:00", name: "Pilates", trainer: "Juliana" },
      { time: "17:00", name: "Funcional", trainer: "Amanda" },
      { time: "19:00", name: "HIIT", trainer: "Bruno" },
      { time: "20:30", name: "Yoga", trainer: "Juliana" },
    ],
  },
  {
    day: "Sexta",
    classes: [
      { time: "06:00", name: "Funcional", trainer: "Amanda" },
      { time: "08:00", name: "Spinning", trainer: "Carlos" },
      { time: "17:00", name: "CrossFit", trainer: "Bruno" },
      { time: "18:30", name: "Dance", trainer: "Amanda" },
      { time: "20:00", name: "Alongamento", trainer: "Juliana" },
    ],
  },
  {
    day: "Sábado",
    classes: [
      { time: "08:00", name: "Spinning", trainer: "Carlos" },
      { time: "09:30", name: "Funcional", trainer: "Bruno" },
      { time: "11:00", name: "Yoga", trainer: "Juliana" },
    ],
  },
];

export const ScheduleSection = () => {
  return (
    <section id="schedule" className="py-24 bg-gradient-dark">
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
            Horários
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-4">
            GRADE DE <span className="text-gradient">AULAS</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Confira nossa programação semanal de aulas em grupo e encontre o
            melhor horário para você.
          </p>
        </motion.div>

        {/* Schedule Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-x-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-max lg:min-w-0">
            {schedule.map((day, dayIndex) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: dayIndex * 0.1 }}
                className="bg-gradient-card border border-border rounded-xl overflow-hidden"
              >
                <div className="bg-primary/10 p-4 text-center border-b border-border">
                  <h3 className="font-display text-xl text-primary">
                    {day.day}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {day.classes.map((classItem, classIndex) => (
                    <div
                      key={classIndex}
                      className="bg-secondary/50 rounded-lg p-3 hover:bg-primary/10 transition-colors duration-300 group"
                    >
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-sm font-medium">
                          {classItem.time}
                        </span>
                      </div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {classItem.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {classItem.trainer}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
