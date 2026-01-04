import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Legend
} from 'recharts';
import { TrendingUp, Scale, Percent, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvolutionPhoto {
  id: string;
  photo_url: string;
  photo_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  notes: string | null;
  photo_type: string;
}

interface EvolutionChartsProps {
  photos: EvolutionPhoto[];
}

const EvolutionCharts: React.FC<EvolutionChartsProps> = ({ photos }) => {
  const chartData = useMemo(() => {
    const sortedPhotos = [...photos]
      .filter(p => p.weight_kg || p.body_fat_percentage)
      .sort((a, b) => new Date(a.photo_date).getTime() - new Date(b.photo_date).getTime());
    
    // Group by date and get averages
    const groupedByDate = sortedPhotos.reduce((acc, photo) => {
      const date = photo.photo_date;
      if (!acc[date]) {
        acc[date] = { weights: [], fats: [] };
      }
      if (photo.weight_kg) acc[date].weights.push(photo.weight_kg);
      if (photo.body_fat_percentage) acc[date].fats.push(photo.body_fat_percentage);
      return acc;
    }, {} as Record<string, { weights: number[]; fats: number[] }>);

    return Object.entries(groupedByDate).map(([date, data]) => ({
      date,
      dateFormatted: format(new Date(date), 'dd/MM', { locale: ptBR }),
      dateLabel: format(new Date(date), "dd MMM", { locale: ptBR }),
      weight: data.weights.length > 0 
        ? data.weights.reduce((a, b) => a + b, 0) / data.weights.length 
        : null,
      bodyFat: data.fats.length > 0 
        ? data.fats.reduce((a, b) => a + b, 0) / data.fats.length 
        : null,
    }));
  }, [photos]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    
    return {
      weightChange: first.weight && last.weight ? last.weight - first.weight : null,
      fatChange: first.bodyFat && last.bodyFat ? last.bodyFat - first.bodyFat : null,
      totalRecords: chartData.length,
    };
  }, [chartData]);

  if (chartData.length < 2) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="p-6 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Adicione fotos com peso ou % gordura para ver sua evolução em gráficos
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(1)}{entry.name === 'Peso' ? ' kg' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-bebas text-lg">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Gráficos de Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold">{stats.totalRecords}</p>
              <p className="text-[10px] text-muted-foreground">registros</p>
            </div>
            
            {stats.weightChange !== null && (
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <Scale className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                <p className={`text-lg font-bold ${
                  stats.weightChange < 0 ? 'text-green-500' : stats.weightChange > 0 ? 'text-orange-500' : ''
                }`}>
                  {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)}kg
                </p>
                <p className="text-[10px] text-muted-foreground">variação</p>
              </div>
            )}
            
            {stats.fatChange !== null && (
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <Percent className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                <p className={`text-lg font-bold ${
                  stats.fatChange < 0 ? 'text-green-500' : stats.fatChange > 0 ? 'text-red-500' : ''
                }`}>
                  {stats.fatChange > 0 ? '+' : ''}{stats.fatChange.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground">gordura</p>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="combined" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="combined" className="text-xs">Combinado</TabsTrigger>
            <TabsTrigger value="weight" className="text-xs">Peso</TabsTrigger>
            <TabsTrigger value="fat" className="text-xs">Gordura</TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined" className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  hide
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={8}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="weight" 
                  name="Peso"
                  stroke="hsl(270, 70%, 60%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(270, 70%, 60%)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="bodyFat" 
                  name="% Gordura"
                  stroke="hsl(24, 100%, 50%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(24, 100%, 50%)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="weight" className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  name="Peso"
                  stroke="hsl(270, 70%, 60%)" 
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={{ fill: 'hsl(270, 70%, 60%)', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="fat" className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="bodyFat" 
                  name="% Gordura"
                  stroke="hsl(24, 100%, 50%)" 
                  strokeWidth={2}
                  fill="url(#fatGradient)"
                  dot={{ fill: 'hsl(24, 100%, 50%)', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EvolutionCharts;
