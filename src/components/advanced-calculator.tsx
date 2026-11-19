
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar as CalendarIcon, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { format, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import { DialogHeader, DialogTitle } from './ui/dialog';


interface StandardCalculatorProps {
    initialValue?: number;
    onResult?: (result: number) => void;
}

const StandardCalculator = ({ initialValue, onResult }: StandardCalculatorProps) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [currentExpression, setCurrentExpression] = useState('');
  const [memory, setMemory] = useState(0);
  const [isNewNumber, setIsNewNumber] = useState(true);

  useEffect(() => {
    if (initialValue !== undefined) {
      setDisplayValue(String(initialValue));
      setIsNewNumber(true);
    }
  }, [initialValue]);

  const handleInput = (input: string) => {
    if (isNewNumber) {
      setDisplayValue(input);
      setIsNewNumber(false);
    } else {
      setDisplayValue(displayValue === '0' ? input : displayValue + input);
    }
  };

  const handleOperator = (operator: string) => {
    if (currentExpression && !isNewNumber) {
      calculateResult(false);
      setCurrentExpression(displayValue + ' ' + operator);
    } else {
      setCurrentExpression(displayValue + ' ' + operator);
    }
    setIsNewNumber(true);
  };

  const calculateResult = (isFinal = true) => {
    if (!currentExpression || isNewNumber) {
        if (isFinal && onResult) {
            const result = parseFloat(displayValue);
            if (!isNaN(result)) {
                onResult(result);
            }
        }
        return;
    };
    
    const fullExpression = currentExpression + ' ' + displayValue;
    try {
      const sanitizedExpression = fullExpression.replace(/x/g, '*');
      const result = new Function('return ' + sanitizedExpression)();
      
      const resultStr = String(parseFloat(result.toPrecision(15)));

      setHistory([...history, `${fullExpression} = ${resultStr}`]);
      setDisplayValue(resultStr);
      setCurrentExpression('');
      setIsNewNumber(true);

      if (isFinal && onResult) {
          onResult(parseFloat(resultStr));
      }

    } catch (error) {
      setDisplayValue('Error');
      setCurrentExpression('');
      setIsNewNumber(true);
    }
  };

  const clearAll = () => {
    setDisplayValue('0');
    setCurrentExpression('');
    setHistory([]);
    setIsNewNumber(true);
  };

  const clearEntry = () => {
    setDisplayValue('0');
    setIsNewNumber(true);
  };

  const handleMemory = (op: 'MC' | 'MR' | 'M+' | 'M-') => {
    const currentValue = parseFloat(displayValue);
    if (isNaN(currentValue)) return;
    switch (op) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplayValue(String(memory)); break;
      case 'M+': setMemory(memory + currentValue); break;
      case 'M-': setMemory(memory - currentValue); break;
    }
    setIsNewNumber(true);
  };

  const buttons = [
    { label: 'MC', action: () => handleMemory('MC'), className: 'bg-secondary' },
    { label: 'MR', action: () => handleMemory('MR'), className: 'bg-secondary' },
    { label: 'M+', action: () => handleMemory('M+'), className: 'bg-secondary' },
    { label: 'M-', action: () => handleMemory('M-'), className: 'bg-secondary' },
    { label: 'CE', action: clearEntry, className: 'bg-secondary' },
    { label: 'C', action: clearAll, className: 'bg-secondary' },
    { label: '÷', action: () => handleOperator('/'), className: 'bg-secondary' },
    { label: 'x', action: () => handleOperator('x'), className: 'bg-secondary' },
    { label: '7', action: () => handleInput('7') },
    { label: '8', action: () => handleInput('8') },
    { label: '9', action: () => handleInput('9') },
    { label: '-', action: () => handleOperator('-'), className: 'bg-secondary' },
    { label: '4', action: () => handleInput('4') },
    { label: '5', action: () => handleInput('5') },
    { label: '6', action: () => handleInput('6') },
    { label: '+', action: () => handleOperator('+'), className: 'bg-secondary' },
    { label: '1', action: () => handleInput('1') },
    { label: '2', action: () => handleInput('2') },
    { label: '3', action: () => handleInput('3') },
    { label: '=', action: () => calculateResult(true), className: 'row-span-2 bg-primary hover:bg-primary/90' },
    { label: '0', action: () => handleInput('0'), className: 'col-span-2' },
    { label: '.', action: () => { if (!displayValue.includes('.')) handleInput('.'); } },
  ];

  return (
    <Card className="w-full max-w-sm mx-auto shadow-none border-0 rounded-lg overflow-hidden">
        <CardHeader className="p-2">
            <div className="bg-muted text-muted-foreground p-2 rounded-t-md h-24 flex flex-col justify-end">
            <div className="text-right text-xs h-6">{currentExpression}</div>
            <div className="text-right text-3xl font-semibold text-foreground truncate">{displayValue}</div>
            </div>
        </CardHeader>
        <CardContent className="p-2">
            <div className="grid grid-cols-4 gap-1">
                <ScrollArea className="col-span-4 h-20 mb-2 border rounded-md p-2 text-sm text-right">
                    {history.map((item, index) => (
                        <div key={index}>{item}</div>
                    )).reverse()}
                </ScrollArea>
            {buttons.map(btn => (
                <Button
                key={btn.label}
                onClick={btn.action}
                className={`h-12 text-lg ${btn.className || ''} ${btn.label === '0' ? 'col-span-2' : ''} ${btn.label === '=' ? 'row-span-2' : ''}`}
                variant={btn.className ? "secondary" : "outline"}
                >
                {btn.label}
                </Button>
            ))}
            </div>
        </CardContent>
    </Card>
  );
}

const conversionFactors = {
  length: {
    'Metros (m)': 1, 'Centímetros (cm)': 100, 'Pulgadas (in)': 39.3701, 'Pies (ft)': 3.28084, 'Varas': 1.1963,
  },
  weight: {
    'Kilogramos (kg)': 1, 'Gramos (g)': 1000, 'Libras (lb)': 2.20462, 'Onzas (oz)': 35.274,
  },
  volume: {
    'Litros (l)': 1, 'Mililitros (ml)': 1000, 'Galones (US gal)': 0.264172,
  },
  area: {
    'Metros² (m²)': 1, 'Pies² (ft²)': 10.7639, 'Varas²': 1.4311,
  },
  energy: {
    'Julios (J)': 1,
    'Kilojulios (kJ)': 0.001,
    'Calorías (cal)': 0.239006,
    'Kilocalorías (kcal)': 0.000239006,
    'Vatio-hora (Wh)': 0.000277778,
    'Kilovatio-hora (kWh)': 2.7778e-7,
    'BTU': 0.000947817,
  },
  currency: {
    'USD': 1, 'GTQ': 7.78, 'EUR': 0.92,
  }
};

const UnitConverter = () => {
    const [conversionType, setConversionType] = useState<keyof typeof conversionFactors>('length');
    const [fromUnit, setFromUnit] = useState<string>('Metros (m)');
    const [toUnit, setToUnit] = useState<string>('Pies (ft)');
    const [inputValue, setInputValue] = useState<string>('1');
    const [outputValue, setOutputValue] = useState<string>('');

    const units = conversionFactors[conversionType];

    useEffect(() => {
        const convert = () => {
            const inputNum = parseFloat(inputValue);
            if (isNaN(inputNum)) {
                setOutputValue('Entrada inválida');
                return;
            }

            const fromFactor = units[fromUnit as keyof typeof units];
            const toFactor = units[toUnit as keyof typeof units];
            
            // Convert input to base unit, then to target unit
            const valueInBaseUnit = inputNum / fromFactor;
            const result = valueInBaseUnit * toFactor;
            setOutputValue(result.toLocaleString(undefined, { maximumFractionDigits: 5 }));
        };
        convert();
    }, [inputValue, fromUnit, toUnit, units]);


    return (
        <div className="p-4 space-y-4">
            <Select value={conversionType} onValueChange={(val) => {
                const newType = val as keyof typeof conversionFactors;
                setConversionType(newType);
                const newUnits = Object.keys(conversionFactors[newType]);
                setFromUnit(newUnits[0]);
                setToUnit(newUnits[1] || newUnits[0]);
            }}>
                <SelectTrigger><SelectValue placeholder="Tipo de conversión"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="length">Longitud</SelectItem>
                    <SelectItem value="weight">Peso</SelectItem>
                    <SelectItem value="volume">Volumen</SelectItem>
                    <SelectItem value="area">Área</SelectItem>
                    <SelectItem value="energy">Energía</SelectItem>
                    <SelectItem value="currency">Moneda</SelectItem>
                </SelectContent>
            </Select>

            <div className="space-y-2">
                <Label htmlFor="fromValue">{fromUnit}</Label>
                <Input id="fromValue" type="number" value={inputValue} onChange={e => { setInputValue(e.target.value); }} className="text-2xl h-12"/>
            </div>

            <div className="flex justify-center">
                <Button variant="ghost" size="icon" onClick={() => {
                    setFromUnit(toUnit);
                    setToUnit(fromUnit);
                }}><ArrowRightLeft/></Button>
            </div>

            <div className="space-y-2">
                <Label htmlFor="toValue">{toUnit}</Label>
                <Input id="toValue" value={outputValue} readOnly className="text-2xl h-12 font-bold bg-muted"/>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <Select value={fromUnit} onValueChange={val => {setFromUnit(val); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.keys(units).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={toUnit} onValueChange={val => {setToUnit(val); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.keys(units).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

const DateCalculator = () => {
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 1)));

    const diffDays = differenceInDays(toDate, fromDate);
    const diffMonths = differenceInMonths(toDate, fromDate);
    const diffYears = differenceInYears(toDate, fromDate);

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-2">
                <Label>Desde</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(fromDate, "PPP")}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={(d) => setFromDate(d || new Date())} initialFocus /></PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Hasta</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(toDate, "PPP")}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={(d) => setToDate(d || new Date())} initialFocus /></PopoverContent>
                </Popover>
            </div>
            <Card className="bg-muted">
                <CardContent className="text-center p-4">
                    <p className="font-bold text-2xl">{diffDays} días</p>
                    <p className="text-sm text-muted-foreground">{diffYears} años, {diffMonths % 12} meses y {diffDays % 30} días</p>
                </CardContent>
            </Card>
        </div>
    );
}

interface AdvancedCalculatorProps {
    initialValue?: number;
    onResult?: (result: number) => void;
}

/**
 * A component representing an advanced calculator with memory and history functions.
 * @returns {JSX.Element} The advanced calculator component.
 */
export const AdvancedCalculator = ({ initialValue, onResult }: AdvancedCalculatorProps) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <DialogHeader>
        <DialogTitle className="sr-only">Calculadora Avanzada</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="converter">Convertidor</TabsTrigger>
          <TabsTrigger value="date">Fechas</TabsTrigger>
        </TabsList>
        <TabsContent value="calculator">
            <StandardCalculator initialValue={initialValue} onResult={onResult} />
        </TabsContent>
        <TabsContent value="converter">
            <UnitConverter />
        </TabsContent>
        <TabsContent value="date">
            <DateCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};
