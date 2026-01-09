import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Check, FileDown, Share2, Plus, Minus, 
  Trash2, Apple, Beef, Wheat, Droplets, Salad, X
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
}

interface ShoppingListProps {
  meals: MealSlot[];
  daysMultiplier?: number;
  onClose?: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  proteina: { label: 'Proteínas', icon: <Beef className="w-4 h-4" />, color: 'text-red-500' },
  carboidrato: { label: 'Carboidratos', icon: <Wheat className="w-4 h-4" />, color: 'text-amber-500' },
  gordura: { label: 'Gorduras', icon: <Droplets className="w-4 h-4" />, color: 'text-yellow-500' },
  vegetal: { label: 'Vegetais', icon: <Salad className="w-4 h-4" />, color: 'text-green-500' },
  outros: { label: 'Outros', icon: <Apple className="w-4 h-4" />, color: 'text-purple-500' },
};

const ShoppingList: React.FC<ShoppingListProps> = ({ meals, daysMultiplier = 7, onClose }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<{ doc: jsPDF; filename: string } | null>(null);

  // Aggregate foods from all meals
  const shoppingItems = useMemo(() => {
    const foodMap = new Map<string, ShoppingItem>();
    
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        const baseId = food.id.split('-')[0]; // Remove timestamp suffix
        const existing = foodMap.get(baseId);
        
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
          });
        }
      });
    });

    // Multiply by days
    const items = Array.from(foodMap.values()).map(item => ({
      ...item,
      quantity: item.quantity * daysMultiplier,
    }));

    return items.sort((a, b) => a.category.localeCompare(b.category));
  }, [meals, daysMultiplier]);

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

  const totalItems = shoppingItems.length + customItems.length;
  const checkedCount = checkedItems.size;
  const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Compras', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cardápio para ${daysMultiplier} dias`, pageWidth / 2, 32, { align: 'center' });
    
    let yPos = 50;
    doc.setTextColor(0, 0, 0);
    
    // Group items by category for PDF
    Object.entries(groupedItems).forEach(([category, items]) => {
      const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.outros;
      
      // Category header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(config.label.toUpperCase(), 14, yPos);
      yPos += 2;
      
      doc.setDrawColor(34, 197, 94);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 8;
      
      // Items
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      items.forEach(item => {
        const isChecked = checkedItems.has(item.id);
        const checkMark = isChecked ? '☑' : '☐';
        const text = `${checkMark} ${item.name} - ${item.quantity}x (${item.portion})`;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        if (isChecked) {
          doc.setTextColor(150, 150, 150);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        
        doc.text(text, 20, yPos);
        yPos += 7;
      });
      
      yPos += 8;
    });
    
    // Footer
    const footerY = doc.internal.pageSize.height - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} - Gym Pro Fitness`, pageWidth / 2, footerY, { align: 'center' });
    
    return { doc, filename: `lista-compras-${daysMultiplier}dias.pdf` };
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
        const itemsText = items.map(item => `  • ${item.name} (${item.quantity}x)`).join('\n');
        return `*${config.label}*\n${itemsText}`;
      })
      .join('\n\n');
    
    const message = `🛒 *Lista de Compras - ${daysMultiplier} dias*\n\n${itemsList}\n\n_Gerado por Gym Pro Fitness_`;
    
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
              {checkedCount} de {totalItems} itens • {daysMultiplier} dias
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
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
        <p className="text-xs text-muted-foreground text-right">
          {Math.round(progressPercentage)}% completo
        </p>
      </div>

      {/* Shopping items by category */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedItems).map(([category, items]) => {
              const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.outros;
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={config.color}>{config.icon}</span>
                    <h4 className="font-medium text-sm">{config.label}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const isChecked = checkedItems.has(item.id);
                      const isCustom = item.id.startsWith('custom-');
                      
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
                          
                          <div className={`flex-1 ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.portion}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isCustom && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            
                            <Badge variant={isChecked ? "secondary" : "outline"}>
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
        </CardContent>
      </Card>

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
