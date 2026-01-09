import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface MealFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

interface Meal {
  name: string;
  time: string;
  foods: MealFood[];
}

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyChartData {
  date: string;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hydration: number;
}

interface ExportMealPlanOptions {
  planName: string;
  meals: Meal[];
  goals: NutritionGoals;
  totals: NutritionTotals;
  userName?: string;
  date?: Date;
}

interface ExportChartsOptions {
  periodLabel: string;
  viewMode: 'week' | 'month';
  dailyData: DailyChartData[];
  goals: NutritionGoals & { hydration: number };
  averages: NutritionTotals & { hydration: number };
  userName?: string;
}

export interface ShareOptions {
  method: 'whatsapp' | 'email';
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

// Brand colors
const COLORS = {
  primary: [249, 115, 22] as [number, number, number], // Orange-500
  secondary: [239, 68, 68] as [number, number, number], // Red-500
  tertiary: [59, 130, 246] as [number, number, number], // Blue-500
  quaternary: [234, 179, 8] as [number, number, number], // Yellow-500
  dark: [17, 24, 39] as [number, number, number], // Gray-900
  light: [249, 250, 251] as [number, number, number], // Gray-50
  muted: [107, 114, 128] as [number, number, number], // Gray-500
};

function addHeader(doc: jsPDF, title: string, userName?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 35, pageWidth, 3, 'F');
  
  // Logo/Brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GYMFIT PRO', 15, 18);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Plano Nutricional Personalizado', 15, 27);
  
  // Title on right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth - 15, 18, { align: 'right' });
  
  // Date and user
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(dateStr, pageWidth - 15, 27, { align: 'right' });
  
  if (userName) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(`Aluno: ${userName}`, pageWidth - 15, 32, { align: 'right' });
  }
  
  return 45; // Starting Y position after header
}

function addFooter(doc: jsPDF, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  // Footer text
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text(
    'Documento gerado automaticamente pelo GymFit Pro',
    15,
    pageHeight - 8
  );
  doc.text(
    `Página ${pageNumber}`,
    pageWidth - 15,
    pageHeight - 8,
    { align: 'right' }
  );
}

function addSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number] = COLORS.primary) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Section background
  doc.setFillColor(...color);
  doc.roundedRect(15, y, pageWidth - 30, 10, 2, 2, 'F');
  
  // Section title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 20, y + 7);
  
  return y + 15;
}

function addGoalsBox(doc: jsPDF, y: number, goals: NutritionGoals, totals: NutritionTotals) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 40) / 4;
  
  // Goals vs Achieved comparison
  const items = [
    { label: 'Calorias', goal: goals.calories, value: totals.calories, unit: 'kcal', color: COLORS.primary },
    { label: 'Proteína', goal: goals.protein, value: totals.protein, unit: 'g', color: COLORS.secondary },
    { label: 'Carboidratos', goal: goals.carbs, value: totals.carbs, unit: 'g', color: COLORS.tertiary },
    { label: 'Gorduras', goal: goals.fat, value: totals.fat, unit: 'g', color: COLORS.quaternary },
  ];
  
  items.forEach((item, index) => {
    const x = 15 + (boxWidth * index) + (index * 3);
    const percentage = Math.min((item.value / item.goal) * 100, 100);
    
    // Box background
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, boxWidth, 35, 3, 3, 'F');
    
    // Color accent bar
    doc.setFillColor(...item.color);
    doc.roundedRect(x, y, boxWidth, 4, 3, 3, 'F');
    doc.rect(x, y + 2, boxWidth, 2, 'F');
    
    // Label
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, x + boxWidth / 2, y + 12, { align: 'center' });
    
    // Value
    doc.setFontSize(14);
    doc.setTextColor(...item.color);
    doc.text(`${item.value}`, x + boxWidth / 2, y + 23, { align: 'center' });
    
    // Goal
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Meta: ${item.goal}${item.unit}`, x + boxWidth / 2, y + 30, { align: 'center' });
    
    // Progress bar background
    doc.setFillColor(220, 220, 220);
    doc.rect(x + 5, y + 32, boxWidth - 10, 2, 'F');
    
    // Progress bar fill
    doc.setFillColor(...item.color);
    doc.rect(x + 5, y + 32, (boxWidth - 10) * (percentage / 100), 2, 'F');
  });
  
  return y + 42;
}

export function exportMealPlanToPDF(options: ExportMealPlanOptions): { doc: jsPDF; filename: string } {
  const { planName, meals, goals, totals, userName } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, planName, userName);
  
  // Goals summary section
  currentY = addSectionTitle(doc, currentY, 'Resumo Nutricional');
  currentY = addGoalsBox(doc, currentY, goals, totals);
  currentY += 10;
  
  // Meals section
  currentY = addSectionTitle(doc, currentY, 'Cardápio do Dia');
  
  meals.forEach((meal, mealIndex) => {
    if (meal.foods.length === 0) return;
    
    // Check if we need a new page
    if (currentY > 240) {
      addFooter(doc, doc.getNumberOfPages());
      doc.addPage();
      currentY = 20;
    }
    
    // Meal header
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, currentY, pageWidth - 30, 8, 2, 2, 'F');
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.3);
    doc.line(15, currentY, 15, currentY + 8);
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${meal.name} - ${meal.time}`, 20, currentY + 5.5);
    
    // Meal totals
    const mealTotals = meal.foods.reduce((acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `${mealTotals.calories} kcal | P: ${mealTotals.protein}g | C: ${mealTotals.carbs}g | G: ${mealTotals.fat}g`,
      pageWidth - 20,
      currentY + 5.5,
      { align: 'right' }
    );
    
    currentY += 10;
    
    // Foods table
    const tableData = meal.foods.map(food => [
      food.name,
      food.portion,
      `${food.calories}`,
      `${food.protein}g`,
      `${food.carbs}g`,
      `${food.fat}g`,
    ]);
    
    doc.autoTable({
      startY: currentY,
      head: [['Alimento', 'Porção', 'Calorias', 'Proteína', 'Carbos', 'Gorduras']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: COLORS.muted,
        fontStyle: 'bold',
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 30 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: 17, right: 17 },
      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },
    });
    
    currentY = doc.lastAutoTable.finalY + 8;
  });
  
  // Notes section
  if (currentY < 240) {
    currentY = addSectionTitle(doc, currentY + 5, 'Observações para o Nutricionista', COLORS.muted);
    
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.2);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(15, currentY, pageWidth - 30, 30, 2, 2, 'FD');
    
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text('Espaço para anotações do profissional:', 20, currentY + 8);
  }
  
  addFooter(doc, doc.getNumberOfPages());
  
  // Save the PDF
  const filename = `cardapio-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
  
  return { doc, filename };
}

export function exportNutritionChartsToPDF(options: ExportChartsOptions): { doc: jsPDF; filename: string } {
  const { periodLabel, viewMode, dailyData, goals, averages, userName } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = addHeader(doc, `Relatório ${viewMode === 'week' ? 'Semanal' : 'Mensal'}`, userName);
  
  // Period info
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Período: ${periodLabel}`, 15, currentY);
  currentY += 10;
  
  // Averages section
  currentY = addSectionTitle(doc, currentY, 'Médias do Período');
  currentY = addGoalsBox(doc, currentY, goals, averages);
  currentY += 10;
  
  // Daily breakdown table
  currentY = addSectionTitle(doc, currentY, 'Dados Diários');
  
  const tableData = dailyData.map(day => [
    day.dayName,
    day.date,
    `${day.calories} kcal`,
    `${day.protein}g`,
    `${day.carbs}g`,
    `${day.fat}g`,
    `${day.hydration}ml`,
  ]);
  
  doc.autoTable({
    startY: currentY,
    head: [['Dia', 'Data', 'Calorias', 'Proteína', 'Carbos', 'Gorduras', 'Água']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
  });
  
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Statistics summary
  if (currentY < 230) {
    currentY = addSectionTitle(doc, currentY, 'Estatísticas');
    
    const daysOnTarget = dailyData.filter(d => 
      d.calories >= goals.calories * 0.8 && d.calories <= goals.calories * 1.1
    ).length;
    
    const daysHydrated = dailyData.filter(d => d.hydration >= goals.hydration).length;
    
    const stats = [
      { label: 'Total de dias registrados', value: dailyData.length.toString() },
      { label: 'Dias dentro da meta calórica (±20%)', value: `${daysOnTarget} (${Math.round(daysOnTarget / dailyData.length * 100)}%)` },
      { label: 'Dias com hidratação adequada', value: `${daysHydrated} (${Math.round(daysHydrated / dailyData.length * 100)}%)` },
      { label: 'Média de calorias diárias', value: `${averages.calories} kcal` },
      { label: 'Média de proteína diária', value: `${averages.protein}g` },
      { label: 'Média de hidratação diária', value: `${averages.hydration}ml` },
    ];
    
    stats.forEach((stat, index) => {
      const y = currentY + (index * 8);
      doc.setFillColor(index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248);
      doc.rect(15, y, pageWidth - 30, 7, 'F');
      
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.label, 20, y + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(stat.value, pageWidth - 20, y + 5, { align: 'right' });
    });
    
    currentY += stats.length * 8 + 10;
  }
  
  // Recommendations section
  if (currentY < 250) {
    currentY = addSectionTitle(doc, currentY, 'Espaço para Recomendações', COLORS.muted);
    
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.2);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(15, currentY, pageWidth - 30, 25, 2, 2, 'FD');
  }
  
  addFooter(doc, doc.getNumberOfPages());
  
  // Save the PDF
  const filename = `relatorio-nutricional-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
  
  return { doc, filename };
}

// Share via WhatsApp
export function shareViaWhatsApp(message: string): void {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

// Share meal plan via WhatsApp with summary
export function shareMealPlanViaWhatsApp(options: ExportMealPlanOptions): void {
  const { planName, totals, goals, userName } = options;
  
  const message = `🍽️ *${planName}*${userName ? ` - ${userName}` : ''}

📊 *Resumo Nutricional:*
• Calorias: ${totals.calories}/${goals.calories} kcal
• Proteína: ${totals.protein}/${goals.protein}g
• Carboidratos: ${totals.carbs}/${goals.carbs}g
• Gorduras: ${totals.fat}/${goals.fat}g

📱 _Cardápio gerado pelo GymFit Pro_
💡 Para ver o cardápio completo, solicite o PDF por email!`;

  shareViaWhatsApp(message);
}

// Share charts via WhatsApp with summary
export function shareChartsSummaryViaWhatsApp(options: ExportChartsOptions): void {
  const { periodLabel, averages, goals, dailyData } = options;
  
  const daysOnTarget = dailyData.filter(d => 
    d.calories >= goals.calories * 0.8 && d.calories <= goals.calories * 1.1
  ).length;
  
  const message = `📈 *Relatório Nutricional*
📅 Período: ${periodLabel}

📊 *Médias do Período:*
• Calorias: ${averages.calories} kcal/dia
• Proteína: ${averages.protein}g/dia
• Carboidratos: ${averages.carbs}g/dia
• Gorduras: ${averages.fat}g/dia
• Hidratação: ${averages.hydration}ml/dia

🎯 Dias na meta: ${daysOnTarget}/${dailyData.length}

📱 _Relatório gerado pelo GymFit Pro_`;

  shareViaWhatsApp(message);
}

// Send PDF via email
export async function sendPdfViaEmail(
  pdfDoc: jsPDF,
  filename: string,
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messageType: 'meal_plan' | 'nutrition_report'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert PDF to base64
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
    
    const response = await supabase.functions.invoke('send-nutrition-pdf', {
      body: {
        recipientEmail,
        recipientName,
        senderName,
        subject: messageType === 'meal_plan' 
          ? 'Cardápio Nutricional - GymFit Pro' 
          : 'Relatório Nutricional - GymFit Pro',
        pdfBase64,
        pdfFilename: filename,
        messageType,
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending PDF via email:', error);
    return { success: false, error: error.message };
  }
}
