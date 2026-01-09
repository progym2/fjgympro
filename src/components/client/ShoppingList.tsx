import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Check, FileDown, Share2, Plus, Minus, 
  Trash2, Apple, Beef, Wheat, Droplets, Salad, X,
  DollarSign, TrendingUp, Wallet, Pencil, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SharePdfDialog from './SharePdfDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  category: string;
}

interface MealSlot {
  id: string;
  name: string;
  foods: FoodItem[];
}

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  portion: string;
  checked: boolean;
  pricePerUnit: number;
}

interface ShoppingListProps {
  meals: MealSlot[];
  daysMultiplier?: number;
  onClose?: () => void;
}

const DAYS_OPTIONS = [
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias (1 semana)' },
  { value: 14, label: '14 dias (2 semanas)' },
  { value: 30, label: '30 dias (1 mês)' },
];

// Preços estimados por item (em R$) - baseados em valores médios de mercado
const DEFAULT_FOOD_PRICES: Record<string, { price: number; unit: string }> = {
  // Proteínas
  chicken: { price: 2.50, unit: '100g' },      // ~R$25/kg
  eggs: { price: 1.50, unit: '2 ovos' },       // ~R$15/dúzia
  beef: { price: 4.00, unit: '100g' },         // ~R$40/kg
  fish: { price: 3.50, unit: '100g' },         // ~R$35/kg
  tuna: { price: 8.00, unit: '100g' },         // Atum em lata
  whey: { price: 4.00, unit: '1 scoop' },      // ~R$120/30 doses
  
  // Carboidratos
  rice: { price: 0.80, unit: '100g' },         // ~R$8/kg
  sweet_potato: { price: 0.60, unit: '100g' }, // ~R$6/kg
  oats: { price: 1.20, unit: '100g' },         // ~R$12/kg
  bread: { price: 1.50, unit: '2 fatias' },    // Pão integral
  pasta: { price: 0.90, unit: '100g' },        // ~R$9/kg
  banana: { price: 0.80, unit: '1 unidade' },  // ~R$5/kg
  
  // Gorduras
  avocado: { price: 3.00, unit: '100g' },      // ~R$15/unidade média
  olive_oil: { price: 2.50, unit: '1 colher' },// ~R$40/500ml
  nuts: { price: 8.00, unit: '100g' },         // ~R$80/kg
  peanut_butter: { price: 1.50, unit: '1 colher' }, // ~R$25/pote
  
  // Vegetais
  broccoli: { price: 1.50, unit: '100g' },     // ~R$15/kg
  salad: { price: 0.80, unit: '100g' },        // Alface/rúcula
  tomato: { price: 0.80, unit: '100g' },       // ~R$8/kg
  spinach: { price: 1.20, unit: '100g' },      // ~R$12/kg
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  proteina: { label: 'Proteínas', icon: <Beef className="w-4 h-4" />, color: 'text-red-500' },
  carboidrato: { label: 'Carboidratos', icon: <Wheat className="w-4 h-4" />, color: 'text-amber-500' },
  gordura: { label: 'Gorduras', icon: <Droplets className="w-4 h-4" />, color: 'text-yellow-500' },
  vegetal: { label: 'Vegetais', icon: <Salad className="w-4 h-4" />, color: 'text-green-500' },
  outros: { label: 'Outros', icon: <Apple className="w-4 h-4" />, color: 'text-purple-500' },
};

const ShoppingList: React.FC<ShoppingListProps> = ({ meals, daysMultiplier: initialDays = 7, onClose }) => {
  const [selectedDays, setSelectedDays] = useState(initialDays);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<{ doc: jsPDF; filename: string } | null>(null);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('shoppinglist_custom_prices');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingPrice, setEditingPrice] = useState<{ itemId: string; name: string; currentPrice: number } | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  // Persist custom prices to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shoppinglist_custom_prices', JSON.stringify(customPrices));
    } catch (error) {
      console.error('Failed to save custom prices:', error);
    }
  }, [customPrices]);

  // Aggregate foods from all meals with prices
  const shoppingItems = useMemo(() => {
    const foodMap = new Map<string, ShoppingItem>();
    
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        const baseId = food.id.split('-')[0]; // Remove timestamp suffix
        const existing = foodMap.get(baseId);
        const defaultPriceInfo = DEFAULT_FOOD_PRICES[baseId] || { price: 5.00, unit: food.portion };
        const customPrice = customPrices[baseId];
        
        if (existing) {
          existing.quantity += 1;
        } else {
          foodMap.set(baseId, {
            id: baseId,
            name: food.name,
            category: food.category,
            quantity: 1,
            portion: food.portion,
            checked: false,
            pricePerUnit: customPrice !== undefined ? customPrice : defaultPriceInfo.price,
          });
        }
      });
    });

    // Multiply by days
    const items = Array.from(foodMap.values()).map(item => ({
      ...item,
      quantity: item.quantity * selectedDays,
    }));

    return items.sort((a, b) => a.category.localeCompare(b.category));
  }, [meals, selectedDays, customPrices]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    
    [...shoppingItems, ...customItems].forEach(item => {
      const category = item.category || 'outros';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  }, [shoppingItems, customItems]);

  // Calculate totals
  const budgetInfo = useMemo(() => {
    const allItems = [...shoppingItems, ...customItems];
    const totalBudget = allItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
    const checkedBudget = allItems
      .filter(item => checkedItems.has(item.id))
      .reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
    const remainingBudget = totalBudget - checkedBudget;
    
    // Calculate by category
    const categoryBudgets: Record<string, number> = {};
    allItems.forEach(item => {
      const cat = item.category || 'outros';
      categoryBudgets[cat] = (categoryBudgets[cat] || 0) + (item.pricePerUnit * item.quantity);
    });
    
    return { totalBudget, checkedBudget, remainingBudget, categoryBudgets, dailyCost: totalBudget / selectedDays };
  }, [shoppingItems, customItems, checkedItems, selectedDays]);

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const addCustomItem = () => {
    if (!newItemName.trim()) return;
    
    const newItem: ShoppingItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: 'outros',
      quantity: 1,
      portion: 'unidade',
      checked: false,
      pricePerUnit: 5.00, // Default price for custom items
    };
    
    setCustomItems(prev => [...prev, newItem]);
    setNewItemName('');
    toast.success('Item adicionado!');
  };

  const removeCustomItem = (itemId: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCustomItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const openPriceEditor = (itemId: string, name: string, currentPrice: number) => {
    setEditingPrice({ itemId, name, currentPrice });
    setTempPrice(currentPrice.toFixed(2).replace('.', ','));
  };

  const savePriceEdit = () => {
    if (!editingPrice) return;
    
    const parsedPrice = parseFloat(tempPrice.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Preço inválido');
      return;
    }
    
    if (editingPrice.itemId.startsWith('custom-')) {
      setCustomItems(prev => prev.map(item => {
        if (item.id === editingPrice.itemId) {
          return { ...item, pricePerUnit: parsedPrice };
        }
        return item;
      }));
    } else {
      setCustomPrices(prev => ({
        ...prev,
        [editingPrice.itemId]: parsedPrice
      }));
    }
    
    toast.success(`Preço de "${editingPrice.name}" atualizado!`);
    setEditingPrice(null);
    setTempPrice('');
  };

  const resetPrice = (itemId: string) => {
    if (itemId.startsWith('custom-')) {
      setCustomItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, pricePerUnit: 5.00 };
        }
        return item;
      }));
    } else {
      setCustomPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[itemId];
        return newPrices;
      });
    }
    toast.success('Preço restaurado ao padrão');
    setEditingPrice(null);
  };

  const totalItems = shoppingItems.length + customItems.length;
  const checkedCount = checkedItems.size;
  const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Compras', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cardápio para ${selectedDays} dias`, pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Orçamento Total: ${formatCurrency(budgetInfo.totalBudget)}`, pageWidth / 2, 40, { align: 'center' });
    
    let yPos = 55;
    doc.setTextColor(0, 0, 0);
    
    // Budget summary box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('RESUMO DO ORÇAMENTO', 20, yPos + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const budgetText = Object.entries(budgetInfo.categoryBudgets)
      .map(([cat, value]) => `${CATEGORY_CONFIG[cat]?.label || 'Outros'}: ${formatCurrency(value)}`)
      .join('  |  ');
    doc.text(budgetText, 20, yPos + 18);
    
    yPos += 35;
    
    // Group items by category for PDF
    Object.entries(groupedItems).forEach(([category, items]) => {
      const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.outros;
      const categoryTotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      
      // Category header
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`${config.label.toUpperCase()} - ${formatCurrency(categoryTotal)}`, 14, yPos);
      yPos += 2;
      
      doc.setDrawColor(34, 197, 94);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 8;
      
      // Items
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      items.forEach(item => {
        const isChecked = checkedItems.has(item.id);
        const checkMark = isChecked ? '☑' : '☐';
        const itemTotal = item.pricePerUnit * item.quantity;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        if (isChecked) {
          doc.setTextColor(150, 150, 150);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        
        const itemText = `${checkMark} ${item.name}`;
        const quantityText = `${item.quantity}x`;
        const priceText = formatCurrency(itemTotal);
        
        doc.text(itemText, 20, yPos);
        doc.text(quantityText, pageWidth - 60, yPos, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(priceText, pageWidth - 20, yPos, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        yPos += 7;
      });
      
      yPos += 8;
    });
    
    // Footer with total
    const footerY = doc.internal.pageSize.height - 25;
    doc.setFillColor(34, 197, 94);
    doc.rect(0, footerY - 5, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(budgetInfo.totalBudget)}`, pageWidth / 2, footerY + 5, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} - Gym Pro Fitness`, pageWidth / 2, footerY + 15, { align: 'center' });
    
    return { doc, filename: `lista-compras-${selectedDays}dias.pdf` };
  };

  const handleExportPDF = () => {
    const { doc, filename } = generatePDF();
    doc.save(filename);
    toast.success('Lista exportada com sucesso!');
  };

  const handleShare = () => {
    const pdfData = generatePDF();
    setCurrentPdf(pdfData);
    setShowShareDialog(true);
  };

  const handleWhatsAppShare = () => {
    const itemsList = Object.entries(groupedItems)
      .map(([category, items]) => {
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.outros;
        const categoryTotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
        const itemsText = items.map(item => {
          const itemTotal = item.pricePerUnit * item.quantity;
          return `  • ${item.name} (${item.quantity}x) - ${formatCurrency(itemTotal)}`;
        }).join('\n');
        return `*${config.label}* - ${formatCurrency(categoryTotal)}\n${itemsText}`;
      })
      .join('\n\n');
    
    const message = `🛒 *Lista de Compras - ${selectedDays} dias*\n\n${itemsList}\n\n💰 *TOTAL: ${formatCurrency(budgetInfo.totalBudget)}*\n📆 Custo diário: ${formatCurrency(budgetInfo.dailyCost)}\n\n_Gerado por Gym Pro Fitness_`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareDialog(false);
    toast.success('Abrindo WhatsApp...');
  };

  if (totalItems === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Adicione alimentos ao seu cardápio para gerar a lista de compras
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Lista de Compras</h3>
            <p className="text-sm text-muted-foreground">
              {checkedCount} de {totalItems} itens
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          {/* Days selector */}
          <Select
            value={selectedDays.toString()}
            onValueChange={(value) => setSelectedDays(parseInt(value))}
          >
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Orçamento Total</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(budgetInfo.totalBudget)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Já Comprado</span>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(budgetInfo.checkedBudget)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Restante</span>
            </div>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(budgetInfo.remainingBudget)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Por Dia ({selectedDays} dias)</span>
            </div>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(budgetInfo.dailyCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progressPercentage)}% completo</span>
          <span>{formatCurrency(budgetInfo.checkedBudget)} de {formatCurrency(budgetInfo.totalBudget)}</span>
        </div>
      </div>

      {/* Shopping items by category */}
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedItems).map(([category, items]) => {
              const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.outros;
              const categoryTotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <h4 className="font-medium text-sm">{config.label}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {formatCurrency(categoryTotal)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const isChecked = checkedItems.has(item.id);
                      const isCustom = item.id.startsWith('custom-');
                      const itemTotal = item.pricePerUnit * item.quantity;
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            isChecked 
                              ? 'bg-muted/50 border-muted' 
                              : 'bg-card border-border hover:border-primary/30'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="h-5 w-5"
                          />
                          
                          <div className={`flex-1 min-w-0 ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <button
                              onClick={() => openPriceEditor(item.id, item.name, item.pricePerUnit)}
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                            >
                              {item.portion} • {formatCurrency(item.pricePerUnit)}/un
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isCustom && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                            )}
                            
                            <Badge variant={isChecked ? "secondary" : "outline"} className="min-w-[40px] justify-center">
                              {item.quantity}x
                            </Badge>
                            
                            {isCustom && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeCustomItem(item.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            
                            <Badge 
                              variant={isChecked ? "secondary" : "default"} 
                              className={`min-w-[70px] justify-center font-semibold ${
                                !isChecked ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : ''
                              }`}
                            >
                              {formatCurrency(itemTotal)}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Add custom item */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar item personalizado..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
              className="flex-1"
            />
            <Button onClick={addCustomItem} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Clique no preço de qualquer item para editar manualmente
          </p>
        </CardContent>
      </Card>

      {/* Price Edit Dialog */}
      <Dialog open={!!editingPrice} onOpenChange={(open) => !open && setEditingPrice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Preço
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Item</Label>
              <p className="font-medium">{editingPrice?.name}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Preço por unidade (R$)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="price"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    placeholder="0,00"
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && savePriceEdit()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Preço padrão: {formatCurrency(DEFAULT_FOOD_PRICES[editingPrice?.itemId || '']?.price || 5.00)}
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => editingPrice && resetPrice(editingPrice.itemId)}
            >
              Restaurar Padrão
            </Button>
            <Button onClick={savePriceEdit}>
              <Check className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <SharePdfDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        pdfDoc={currentPdf?.doc || null}
        filename={currentPdf?.filename || ''}
        messageType="meal_plan"
        onWhatsAppShare={handleWhatsAppShare}
      />
    </div>
  );
};

export default ShoppingList;
